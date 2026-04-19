const { updateDeal, closeDeal } = require('../db/queries/deals');
const { queryAdmin } = require('../db/pool');

/**
 * Advance deal stage based on AI intent + lead score.
 * Called after every inbound message is processed by the AI engine.
 *
 * @param {string} tenantId
 * @param {string} dealId
 * @param {{ intent: string, lead_score: number, suggested_stage: string, estimated_value: number|null }} analysis
 */
async function advanceDeal(tenantId, dealId, analysis) {
  const { intent, lead_score, suggested_stage, estimated_value } = analysis;

  // Fetch current deal
  const res = await queryAdmin(
    'SELECT stage FROM deals WHERE id = $1 AND tenant_id = $2',
    [dealId, tenantId]
  );
  const deal = res.rows[0];
  if (!deal) return null;

  // Don't move closed deals
  if (['won', 'lost'].includes(deal.stage)) return null;

  const updates = {
    lead_score,
    intent,
    probability: scoreToProbability(lead_score),
  };

  if (estimated_value) updates.estimated_value = estimated_value;

  // Only advance stage, never regress
  if (suggested_stage && stageRank(suggested_stage) > stageRank(deal.stage)) {
    updates.stage = suggested_stage;
  }

  const updated = await updateDeal(tenantId, dealId, updates);

  // Update report_daily for new leads
  if (deal.stage === 'new_lead' && updated.stage !== 'new_lead') {
    await bumpReportNewLead(tenantId);
  }

  return updated;
}

/**
 * Attempt to close a deal automatically when intent is confirmed.
 * Agents can also call this manually via the deals API.
 */
async function tryAutoClose(tenantId, dealId, intent) {
  if (intent === 'purchase_confirmed') {
    return closeDeal(tenantId, dealId, 'won');
  }
  return null;
}

async function bumpReportNewLead(tenantId) {
  const today = new Date().toISOString().slice(0, 10);
  await queryAdmin(`
    INSERT INTO report_daily (tenant_id, date, new_leads)
    VALUES ($1, $2, 1)
    ON CONFLICT (tenant_id, date, channel)
    DO UPDATE SET new_leads = report_daily.new_leads + 1
  `, [tenantId, today]);
}

function stageRank(stage) {
  const order = ['new_lead', 'engaged', 'negotiation', 'closing', 'won', 'lost'];
  return order.indexOf(stage);
}

function scoreToProbability(score) {
  if (score >= 80) return 80;
  if (score >= 60) return 55;
  if (score >= 40) return 30;
  if (score >= 20) return 15;
  return 5;
}

module.exports = { advanceDeal, tryAutoClose };
