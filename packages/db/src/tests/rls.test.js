/**
 * RLS isolation test.
 *
 * Proves: with row-level security enforced, a query running under
 * tenant A's context cannot read tenant B's rows — even when the
 * application code "forgets" to filter by tenant_id.
 *
 * Requirements:
 *   - DATABASE_URL points at a Postgres role WITHOUT BYPASSRLS
 *     (RLS is silently ignored for superusers).
 *   - prisma/schema.prisma is migrated and prisma/rls.sql has been applied.
 *
 * Run:  pnpm --filter @chatorai/db test:rls
 */

const { getPrisma, withTenant, disconnect } = require('../client');

const prisma = getPrisma();

const ASSERT = (cond, msg) => {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
    throw new Error(msg);
  }
  console.log(`PASS: ${msg}`);
};

async function setup() {
  const a = await prisma.tenant.create({
    data: { name: 'RLS-Test-A', email: `rls-a-${Date.now()}@example.com` },
  });
  const b = await prisma.tenant.create({
    data: { name: 'RLS-Test-B', email: `rls-b-${Date.now()}@example.com` },
  });

  const custA = await prisma.customer.create({
    data: { tenantId: a.id, channel: 'whatsapp', channelCustomerId: `a-${Date.now()}`, name: 'Alice' },
  });
  const custB = await prisma.customer.create({
    data: { tenantId: b.id, channel: 'whatsapp', channelCustomerId: `b-${Date.now()}`, name: 'Bob' },
  });

  const convA = await prisma.conversation.create({
    data: { tenantId: a.id, customerId: custA.id, channel: 'whatsapp' },
  });
  const convB = await prisma.conversation.create({
    data: { tenantId: b.id, customerId: custB.id, channel: 'whatsapp' },
  });

  await prisma.message.create({
    data: { tenantId: a.id, conversationId: convA.id, direction: 'in', content: 'hello from A' },
  });
  await prisma.message.create({
    data: { tenantId: b.id, conversationId: convB.id, direction: 'in', content: 'hello from B' },
  });

  return { a, b, custA, custB, convA, convB };
}

async function teardown({ a, b }) {
  // Run cleanup outside any RLS context. Cascades remove dependents.
  await prisma.tenant.delete({ where: { id: a.id } }).catch(() => {});
  await prisma.tenant.delete({ where: { id: b.id } }).catch(() => {});
}

async function run() {
  const ctx = await setup();
  const { a, b, convA, convB } = ctx;

  try {
    // Read tenant A's universe under tenant A's context — and expect ONLY A's rows.
    const seenAsA = await withTenant(a.id, async (tx) => {
      const customers = await tx.customer.findMany();
      const conversations = await tx.conversation.findMany();
      const messages = await tx.message.findMany();
      return { customers, conversations, messages };
    });

    ASSERT(seenAsA.customers.length === 1, 'tenant A sees exactly its own customer');
    ASSERT(seenAsA.customers[0].tenantId === a.id, 'tenant A customer.tenantId === A');
    ASSERT(seenAsA.conversations.every((c) => c.tenantId === a.id), 'tenant A sees only its conversations');
    ASSERT(seenAsA.messages.every((m) => m.tenantId === a.id), 'tenant A sees only its messages');

    // Same query under tenant B — should NOT see A's rows.
    const seenAsB = await withTenant(b.id, async (tx) => tx.message.findMany());
    ASSERT(
      seenAsB.every((m) => m.tenantId === b.id),
      'tenant B sees only its messages (no leak from A)'
    );

    // Direct lookup of the OTHER tenant's row — must come back null.
    const stolen = await withTenant(a.id, async (tx) =>
      tx.conversation.findUnique({ where: { id: convB.id } })
    );
    ASSERT(stolen === null, 'tenant A cannot fetch tenant B conversation by id');

    // Updating the other tenant's row from the wrong context must affect zero rows.
    const updated = await withTenant(a.id, async (tx) =>
      tx.message.updateMany({ where: { conversationId: convB.id }, data: { content: 'pwned' } })
    );
    ASSERT(updated.count === 0, 'tenant A update against tenant B rows affects 0 rows');

    // Sanity: tenant B can still read its own message unmodified.
    const stillThere = await withTenant(b.id, async (tx) =>
      tx.message.findFirst({ where: { conversationId: convB.id } })
    );
    ASSERT(stillThere && stillThere.content === 'hello from B', 'tenant B message untouched by cross-tenant write attempt');

    console.log('\nRLS isolation: OK');
  } finally {
    await teardown(ctx);
    await disconnect();
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
  disconnect().catch(() => {});
});
