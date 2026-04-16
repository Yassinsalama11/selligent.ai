const { query, withTransaction } = require('../pool');

async function getOrCreateDeal(tenantId, conversationId, customerId) {
  const existing = await query(`
    SELECT * FROM deals
    WHERE tenant_id = $1 AND conversation_id = $2 AND stage NOT IN ('won','lost')
    LIMIT 1
  `, [tenantId, conversationId]);

  if (existing.rows.length > 0) return existing.rows[0];

  const res = await query(`
    INSERT INTO deals (tenant_id, conversation_id, customer_id)
    VALUES ($1, $2, $3) RETURNING *
  `, [tenantId, conversationId, customerId]);

  return res.rows[0];
}

async function createDeal(tenantId, {
  customer_id,
  conversation_id = null,
  stage = 'new_lead',
  intent = 'manual',
  lead_score = 0,
  estimated_value = 0,
  probability = 0,
  currency = 'USD',
  notes = '',
} = {}) {
  if (!customer_id) throw new Error('customer_id is required');

  const customer = await query(
    'SELECT id FROM customers WHERE id = $1 AND tenant_id = $2 LIMIT 1',
    [customer_id, tenantId]
  );
  if (!customer.rows[0]) {
    const err = new Error('Customer not found');
    err.status = 404;
    throw err;
  }

  if (conversation_id) {
    const conversation = await query(
      'SELECT id FROM conversations WHERE id = $1 AND tenant_id = $2 AND customer_id = $3 LIMIT 1',
      [conversation_id, tenantId, customer_id]
    );
    if (!conversation.rows[0]) conversation_id = null;
  }

  const res = await query(`
    INSERT INTO deals (
      tenant_id, conversation_id, customer_id, stage, intent,
      lead_score, estimated_value, probability, currency, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    tenantId,
    conversation_id,
    customer_id,
    stage,
    intent,
    lead_score,
    estimated_value,
    probability,
    currency,
    notes,
  ]);

  return res.rows[0];
}

async function updateDeal(tenantId, dealId, updates) {
  const allowed = ['stage', 'intent', 'lead_score', 'estimated_value', 'probability', 'currency', 'notes'];
  const fields = Object.keys(updates).filter(k => allowed.includes(k));
  if (!fields.length) throw new Error('No valid fields to update');

  const sets = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
  const values = fields.map(f => updates[f]);

  const res = await query(`
    UPDATE deals SET ${sets}, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING *
  `, [dealId, tenantId, ...values]);

  return res.rows[0];
}

async function closeDeal(tenantId, dealId, stage) {
  if (!['won', 'lost'].includes(stage)) throw new Error('stage must be won or lost');

  return withTransaction(async (client) => {
    const res = await client.query(`
      UPDATE deals SET stage = $1, closed_at = NOW(), updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3 RETURNING *
    `, [stage, dealId, tenantId]);

    const deal = res.rows[0];
    if (!deal) throw new Error('Deal not found');

    // Upsert into report_daily
    const today = new Date().toISOString().slice(0, 10);
    const won = stage === 'won' ? 1 : 0;
    const lost = stage === 'lost' ? 1 : 0;
    const revenue = stage === 'won' ? (deal.estimated_value || 0) : 0;

    await client.query(`
      INSERT INTO report_daily (tenant_id, date, channel, deals_won, deals_lost, revenue_won)
      VALUES ($1, $2, NULL, $3, $4, $5)
      ON CONFLICT (tenant_id, date, channel) DO UPDATE
      SET deals_won = report_daily.deals_won + $3,
          deals_lost = report_daily.deals_lost + $4,
          revenue_won = report_daily.revenue_won + $5
    `, [tenantId, today, won, lost, revenue]);

    return deal;
  });
}

async function listDeals(tenantId, { stage, limit = 100 } = {}) {
  const params = [tenantId];
  let stageFilter = '';
  if (stage) { params.push(stage); stageFilter = `AND d.stage = $${params.length}`; }
  params.push(limit);

  const res = await query(`
    SELECT d.*, cu.name AS customer_name, cu.channel
    FROM deals d JOIN customers cu ON cu.id = d.customer_id
    WHERE d.tenant_id = $1 ${stageFilter}
    ORDER BY d.updated_at DESC
    LIMIT $${params.length}
  `, params);

  return res.rows;
}

module.exports = { createDeal, getOrCreateDeal, updateDeal, closeDeal, listDeals };
