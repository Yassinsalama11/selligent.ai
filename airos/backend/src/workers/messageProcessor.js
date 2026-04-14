const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const messageQueue = new Queue('messages', { connection });

async function addToQueue(payload) {
  await messageQueue.add('process', payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
}

// Worker (run separately via `npm run worker`)
if (require.main === module) {
  const { routeMessage }     = require('../core/messageRouter');
  const { advanceDeal }      = require('../core/dealEngine');
  const { detectIntent }     = require('../ai/intentDetector');
  const { scoreLeadFromAI }  = require('../ai/leadScorer');
  const { generateReply }    = require('../ai/replyGenerator');
  const { executeTriggers }  = require('../core/triggerEngine');
  const { getMessages }      = require('../db/queries/messages');
  const { query }            = require('../db/pool');
  const { getIO }            = require('../channels/livechat/socket');

  const worker = new Worker('messages', async (job) => {
    console.log(`[Worker] Processing ${job.data.channel} message`, job.id);

    // ── 1. Route: normalize + persist + socket emit ──────────────────────────
    const result = await routeMessage(job.data);
    if (!result) return;
    if (result.blocked) {
      console.log(`[Worker] message blocked by tenant settings`, job.id);
      return;
    }

    const { unified, savedMessage, conversation, customer, deal, credentials } = result;
    const { tenant_id: tenantId } = savedMessage;

    // ── 2. Load context for AI ───────────────────────────────────────────────
    const [history, tenantRow, products, offers, shipping] = await Promise.all([
      getMessages(tenantId, conversation.id, { limit: 10 }),
      query('SELECT * FROM tenants WHERE id = $1', [tenantId]).then(r => r.rows[0]),
      query(
        'SELECT name, price, sale_price, currency, stock_status FROM products WHERE tenant_id = $1 AND is_active = TRUE LIMIT 15',
        [tenantId]
      ).then(r => r.rows),
      query(
        'SELECT name, type, value, code FROM offers WHERE tenant_id = $1 AND is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 5',
        [tenantId]
      ).then(r => r.rows),
      query(
        'SELECT name, rates, currency FROM shipping_zones WHERE tenant_id = $1 LIMIT 4',
        [tenantId]
      ).then(r => r.rows),
    ]);

    const messageText = unified.message.content;

    // ── 3. Detect intent ─────────────────────────────────────────────────────
    let analysis;
    try {
      analysis = await detectIntent({
        message: messageText,
        customer,
        history,
        products,
        offers,
      });
    } catch (err) {
      console.error('[Worker] Intent detection failed:', err.message);
      return;
    }

    // ── 4. Adjust lead score with business rules ──────────────────────────────
    const { final_score, probability } = scoreLeadFromAI(
      analysis.lead_score,
      customer,
      analysis.intent,
      {
        settings: tenantRow?.settings || {},
        message: messageText,
        historyLength: history.length,
      }
    );
    analysis.lead_score = final_score;
    analysis.probability = probability;

    // ── 5. Advance deal stage ─────────────────────────────────────────────────
    const updatedDeal = await advanceDeal(tenantId, deal.id, analysis);

    // ── 6. Generate reply suggestion ──────────────────────────────────────────
    let suggestion;
    try {
      suggestion = await generateReply({
        tenantId,
        messageId: savedMessage.id,
        conversationId: conversation.id,
        tenant: tenantRow,
        customer,
        history,
        lastMessage: messageText,
        intent: analysis.intent,
        leadScore: final_score,
        products,
        offers,
        shipping,
        detectedLanguage: analysis.language,
      });
    } catch (err) {
      console.error('[Worker] Reply generation failed:', err.message);
    }

    // ── 7. Run tenant triggers against the analyzed message ───────────────────
    try {
      await executeTriggers({
        tenant: tenantRow,
        tenantId,
        settings: tenantRow?.settings || {},
        conversation,
        customer,
        savedMessage,
        analysis,
        credentials,
        suggestion,
        historyLength: history.length,
      });
    } catch (err) {
      console.error('[Worker] Trigger execution failed:', err.message);
    }

    // ── 8. Push AI results to dashboard in real-time ──────────────────────────
    try {
      const io = getIO();
      io.to(`tenant:${tenantId}`).emit('ai:suggestion', {
        conversation_id: conversation.id,
        deal: updatedDeal || deal,
        analysis,
        suggestion,
      });
    } catch {
      // Socket not available in test environments
    }

    console.log(
      `[Worker] Done — intent: ${analysis.intent}, score: ${final_score}, stage: ${(updatedDeal || deal).stage}`
    );
  }, { connection });

  worker.on('completed', (job) => console.log(`[Worker] done:`, job.id));
  worker.on('failed', (job, err) => console.error(`[Worker] failed:`, job?.id, err.message));
  console.log('[Worker] Message processor running');
}

module.exports = { addToQueue, messageQueue };
