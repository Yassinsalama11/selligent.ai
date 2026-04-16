/**
 * defineAction — factory for safe, audited, idempotent actions.
 *
 * An action is a unit of work that:
 *   - Validates its input and output with Zod schemas
 *   - Records every invocation in action_audits (idempotency + audit trail)
 *   - Supports an approval gate (requiresApproval: true) — execution is
 *     deferred until approve(tenantId, idempotencyKey) is called
 *   - Enforces scope-based authorization via a scopes array
 *
 * Usage:
 *   const sendEmail = defineAction({
 *     id: 'send-email',
 *     scopes: ['email:send'],
 *     input: z.object({ to: z.string().email(), subject: z.string(), body: z.string() }),
 *     output: z.object({ messageId: z.string() }),
 *     requiresApproval: false,
 *     handler: async ({ input }) => {
 *       const result = await mailer.send(input);
 *       return { messageId: result.id };
 *     },
 *   });
 *
 *   // Execute:
 *   const result = await sendEmail.execute({
 *     tenantId: '...',
 *     input: { to: 'user@example.com', subject: 'Hi', body: '...' },
 *     idempotencyKey: 'conv-123-turn-7-email',
 *     callerScopes: ['email:send'],
 *   });
 */
const { getPrisma } = require('@chatorai/db');

/**
 * @typedef {object} ActionDefinition
 * @property {string}   id               — unique identifier, e.g. "send-email"
 * @property {string[]} [scopes]         — required caller scopes
 * @property {import('zod').ZodType} input
 * @property {import('zod').ZodType} output
 * @property {boolean}  [requiresApproval]
 * @property {function} handler          — async ({ input, tenantId, auditId }) => output
 */

/**
 * @param {ActionDefinition} def
 * @returns {{ id: string, execute: function, approve: function, definition: ActionDefinition }}
 */
function defineAction(def) {
  const {
    id: actionId,
    scopes: requiredScopes = [],
    input: inputSchema,
    output: outputSchema,
    requiresApproval = false,
    handler,
  } = def;

  if (!actionId || typeof actionId !== 'string') throw new Error('defineAction: id is required');
  if (typeof handler !== 'function') throw new Error(`defineAction[${actionId}]: handler is required`);

  /**
   * Execute (or enqueue for approval) an action.
   *
   * @param {object} p
   * @param {string}   p.tenantId
   * @param {object}   p.input
   * @param {string}   p.idempotencyKey    — caller-supplied deduplication key
   * @param {string[]} [p.callerScopes]    — scopes the caller possesses
   * @returns {Promise<ActionResult>}
   */
  async function execute({ tenantId, input, idempotencyKey, callerScopes = [] }) {
    if (!tenantId) throw new Error(`Action[${actionId}]: tenantId is required`);
    if (!idempotencyKey) throw new Error(`Action[${actionId}]: idempotencyKey is required`);

    // Scope check
    const missingScopes = requiredScopes.filter((s) => !callerScopes.includes(s));
    if (missingScopes.length > 0) {
      throw Object.assign(
        new Error(`Action[${actionId}]: missing required scopes: ${missingScopes.join(', ')}`),
        { code: 'SCOPE_DENIED', missingScopes },
      );
    }

    // Validate input
    const parseResult = inputSchema.safeParse(input);
    if (!parseResult.success) {
      throw Object.assign(
        new Error(`Action[${actionId}]: invalid input — ${parseResult.error.message}`),
        { code: 'INPUT_INVALID', zodError: parseResult.error },
      );
    }
    const validInput = parseResult.data;

    const prisma = getPrisma();

    // Idempotency check — if a completed/approved record exists, return its output
    const existing = await prisma.actionAudit.findUnique({
      where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
    });

    if (existing) {
      if (existing.status === 'completed') {
        return { status: 'completed', output: existing.output, auditId: existing.id, idempotent: true };
      }
      if (existing.status === 'pending_approval') {
        return { status: 'pending_approval', auditId: existing.id, idempotent: true };
      }
      if (existing.status === 'failed') {
        // Re-execute on failure (not idempotent guard for failures)
      }
    }

    // Create audit record
    const audit = await prisma.actionAudit.upsert({
      where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
      create: {
        tenantId,
        actionId,
        idempotencyKey,
        input: validInput,
        status: requiresApproval ? 'pending_approval' : 'pending',
        requiresApproval,
      },
      update: {
        // Only update status if previous attempt failed
        status: requiresApproval ? 'pending_approval' : 'pending',
        input: validInput,
        error: null,
      },
    });

    if (requiresApproval && audit.status === 'pending_approval' && !audit.approvedAt) {
      return { status: 'pending_approval', auditId: audit.id };
    }

    // Execute handler
    let output;
    try {
      output = await handler({ input: validInput, tenantId, auditId: audit.id });
    } catch (err) {
      await prisma.actionAudit.update({
        where: { id: audit.id },
        data: { status: 'failed', error: err.message, executedAt: new Date() },
      });
      throw Object.assign(
        new Error(`Action[${actionId}]: handler failed — ${err.message}`),
        { code: 'HANDLER_FAILED', cause: err },
      );
    }

    // Validate output
    const outParse = outputSchema.safeParse(output);
    if (!outParse.success) {
      await prisma.actionAudit.update({
        where: { id: audit.id },
        data: { status: 'failed', error: `Invalid output: ${outParse.error.message}`, executedAt: new Date() },
      });
      throw Object.assign(
        new Error(`Action[${actionId}]: handler returned invalid output — ${outParse.error.message}`),
        { code: 'OUTPUT_INVALID', zodError: outParse.error },
      );
    }

    const validOutput = outParse.data;

    await prisma.actionAudit.update({
      where: { id: audit.id },
      data: { status: 'completed', output: validOutput, executedAt: new Date() },
    });

    return { status: 'completed', output: validOutput, auditId: audit.id };
  }

  /**
   * Approve a pending action (for requiresApproval actions).
   * Records approver and immediately executes the handler.
   *
   * @param {object} p
   * @param {string} p.tenantId
   * @param {string} p.idempotencyKey
   * @param {string} p.approvedBy   — UUID of the approving user
   */
  async function approve({ tenantId, idempotencyKey, approvedBy }) {
    const prisma = getPrisma();

    const audit = await prisma.actionAudit.findUnique({
      where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
    });

    if (!audit) throw new Error(`Action[${actionId}]: no pending action found for key ${idempotencyKey}`);
    if (audit.status === 'completed') {
      return { status: 'completed', output: audit.output, auditId: audit.id };
    }
    if (audit.status !== 'pending_approval') {
      throw new Error(`Action[${actionId}]: cannot approve action in status "${audit.status}"`);
    }

    // Mark approved
    await prisma.actionAudit.update({
      where: { id: audit.id },
      data: { approvedBy, approvedAt: new Date(), status: 'pending' },
    });

    // Run handler now
    let output;
    try {
      const validInput = inputSchema.parse(audit.input);
      output = await handler({ input: validInput, tenantId, auditId: audit.id });
    } catch (err) {
      await prisma.actionAudit.update({
        where: { id: audit.id },
        data: { status: 'failed', error: err.message, executedAt: new Date() },
      });
      throw Object.assign(
        new Error(`Action[${actionId}]: handler failed after approval — ${err.message}`),
        { code: 'HANDLER_FAILED', cause: err },
      );
    }

    const validOutput = outputSchema.parse(output);
    await prisma.actionAudit.update({
      where: { id: audit.id },
      data: { status: 'completed', output: validOutput, executedAt: new Date() },
    });

    return { status: 'completed', output: validOutput, auditId: audit.id };
  }

  return { id: actionId, execute, approve, definition: def };
}

module.exports = { defineAction };
