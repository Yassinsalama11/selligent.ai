/**
 * Production eval scorer — Task 2-C1.
 *
 * Scores every AI reply immediately after the stream done event.
 * Designed to be called fire-and-forget — never throws to caller.
 *
 * Flow:
 *   1. Caller fires scoreProductionReply(...).catch(() => {}) after SSE done.
 *   2. This function calls grade() from judge.js.
 *   3. Persists result to message_eval_scores table on the tenant's regional cluster.
 */
const { grade } = require('./judge');
const { getPrismaForTenant } = require('@chatorai/db');
const { emitEvalSignal } = require('./signals');

const EVAL_MODEL = 'claude-sonnet-4-6';

/**
 * Score a production reply and persist to message_eval_scores.
 *
 * @param {object} p
 * @param {string}  p.tenantId
 * @param {string} [p.messageId]        — DB message row id (nullable; may not be persisted yet)
 * @param {string}  p.customerMessage   — inbound customer text
 * @param {string}  p.candidateReply    — the AI-generated reply
 * @param {string} [p.businessContext]  — brief context from TenantProfile (optional)
 * @param {number} [p.passThreshold]    — override default 70
 * @returns {Promise<void>}
 */
async function scoreProductionReply({
  tenantId,
  messageId = null,
  customerMessage,
  candidateReply,
  businessContext,
  passThreshold,
}) {
  if (!tenantId || !customerMessage || !candidateReply) return;

  const t0 = Date.now();
  let result;

  try {
    result = await grade({ customerMessage, candidateReply, businessContext, passThreshold });
  } catch {
    // Judge unavailable (API down, quota, etc.) — skip silently
    return;
  }

  // Emit anonymized platform signal (2-C3) — fire-and-forget
  emitEvalSignal({ ...result, model: EVAL_MODEL }).catch(() => {});

  try {
    const prisma = await getPrismaForTenant(tenantId);
    await prisma.messageEvalScore.create({
      data: {
        messageId: messageId || null,
        tenantId,
        score: result.score,
        pass: result.pass,
        reasoning: result.reasoning || null,
        model: EVAL_MODEL,
        latencyMs: Date.now() - t0,
      },
    });
  } catch {
    // DB write failure — never surface to caller
  }
}

module.exports = { scoreProductionReply };
