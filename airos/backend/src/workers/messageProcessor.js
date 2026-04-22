const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

let connection = null;
let messageQueue = null;

function hasRedisConfig() {
  return Boolean(process.env.REDIS_URL);
}

function getQueueConnection() {
  if (!hasRedisConfig()) {
    return null;
  }

  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }

  return connection;
}

function getMessageQueue() {
  if (!hasRedisConfig()) {
    return null;
  }

  if (!messageQueue) {
    messageQueue = new Queue('messages', { connection: getQueueConnection() });
  }

  return messageQueue;
}

async function processMessage(payload, jobId = 'inline') {
  const { routeMessage }     = require('../core/messageRouter');

  console.log(`[Worker] Processing ${payload.channel} message`, jobId);

  // 1. Route: normalize + persist + socket emit
  const result = await routeMessage(payload);
  if (!result) return;
  if (result.blocked) {
    console.log(`[Worker] message blocked by tenant settings`, jobId);
    return;
  }

  await processRoutedResult(result, jobId);
}

async function processSavedInboundMessage(payload, jobId = 'inline-saved') {
  const { getOrCreateDeal } = require('../db/queries/deals');
  const { decryptMessageRow } = require('../db/queries/messages');
  const { queryAdmin } = require('../db/pool');

  const tenantId = payload.tenant_id;
  const conversationId = payload.conversation_id;
  const customerId = payload.customer_id;
  const messageId = payload.message_id;

  if (!tenantId || !conversationId || !customerId || !messageId) {
    console.warn('AI_SKIPPED_REASON', JSON.stringify({
      reason: 'missing_saved_message_context',
      tenantId,
      conversationId,
      customerId,
      messageId,
    }));
    return;
  }

  const [conversation, customer, rawMessage, tenantRow, ticket] = await Promise.all([
    queryAdmin('SELECT * FROM conversations WHERE tenant_id = $1 AND id = $2 LIMIT 1', [tenantId, conversationId])
      .then((result) => result.rows[0] || null),
    queryAdmin('SELECT * FROM customers WHERE tenant_id = $1 AND id = $2 LIMIT 1', [tenantId, customerId])
      .then((result) => result.rows[0] || null),
    queryAdmin('SELECT * FROM messages WHERE tenant_id = $1 AND id = $2 AND conversation_id = $3 LIMIT 1', [tenantId, messageId, conversationId])
      .then((result) => result.rows[0] || null),
    queryAdmin('SELECT * FROM tenants WHERE id = $1', [tenantId]).then((result) => result.rows[0] || null),
    queryAdmin(
      `SELECT id, priority, channel, assignee_id
       FROM tickets
       WHERE tenant_id = $1
         AND conversation_id = $2
         AND deleted_at IS NULL
       LIMIT 1`,
      [tenantId, conversationId]
    ).then((result) => result.rows[0] || null),
  ]);

  if (!conversation || !customer || !rawMessage) {
    console.warn('AI_SKIPPED_REASON', JSON.stringify({
      reason: 'saved_message_context_not_found',
      tenantId,
      conversationId,
      customerId,
      messageId,
    }));
    return;
  }

  const savedMessage = await decryptMessageRow(tenantId, rawMessage);
  const deal = await getOrCreateDeal(tenantId, conversation.id, customer.id);

  await processRoutedResult({
    unified: {
      channel: conversation.channel,
      message: {
        type: savedMessage.type,
        content: savedMessage.content,
        media_url: savedMessage.media_url,
      },
    },
    savedMessage,
    conversation,
    customer,
    deal,
    ticket,
    credentials: payload.credentials,
    moderation: null,
    blocked: false,
    tenant: tenantRow,
  }, jobId);
}

async function processRoutedResult(result, jobId = 'inline') {
  const { advanceDeal }      = require('../core/dealEngine');
  const { detectIntent }     = require('../ai/intentDetector');
  const { scoreLeadFromAI }  = require('../ai/leadScorer');
  const { generateReply }    = require('../ai/replyGenerator');
  const { executeTriggers }  = require('../core/triggerEngine');
  const { getMessages }      = require('../db/queries/messages');
  const { queryAdmin }       = require('../db/pool');
  const { getIO }            = require('../channels/livechat/socket');

  const { unified, savedMessage, conversation, customer, deal, credentials } = result;
  const { tenant_id: tenantId } = savedMessage;

  // 2. Load context for AI
  const [history, tenantRow, products, offers, shipping] = await Promise.all([
    getMessages(tenantId, conversation.id, { limit: 10 }),
    result.tenant || queryAdmin('SELECT * FROM tenants WHERE id = $1', [tenantId]).then(r => r.rows[0]),
    queryAdmin(
      'SELECT name, price, sale_price, currency, stock_status FROM products WHERE tenant_id = $1 AND is_active = TRUE LIMIT 15',
      [tenantId]
    ).then(r => r.rows),
    queryAdmin(
      'SELECT name, type, value, code FROM offers WHERE tenant_id = $1 AND is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 5',
      [tenantId]
    ).then(r => r.rows),
    queryAdmin(
      'SELECT name, rates, NULL::text AS currency FROM shipping_zones WHERE tenant_id = $1 LIMIT 4',
      [tenantId]
    ).then(r => r.rows),
  ]);

  const messageText = unified.message.content;

  // 3. Detect intent
  let analysis;
  try {
    analysis = await detectIntent({
      tenantId,
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

  // 4. Adjust lead score with business rules
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

  // 5. Advance deal stage
  const updatedDeal = await advanceDeal(tenantId, deal.id, analysis);

  // 6. Generate reply suggestion
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

  await maybeSendAutoReply({
    tenantId,
    conversation,
    customer,
    savedMessage,
    suggestion,
    credentials,
    jobId,
  });

  // 7. Run tenant triggers against the analyzed message
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

  // 8. Push AI results to dashboard in real-time
  try {
    const io = getIO();
    io.to(`tenant:${tenantId}:conversations`).emit('ai:suggestion', {
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
}

async function maybeSendAutoReply({
  tenantId,
  conversation,
  customer,
  savedMessage,
  suggestion,
  credentials,
  jobId,
}) {
  const { getPendingHandoff } = require('../db/queries/handoffs');
  const { saveMessage } = require('../db/queries/messages');
  const { getIO } = require('../channels/livechat/socket');

  const logContext = {
    tenantId,
    conversationId: conversation?.id,
    messageId: savedMessage?.id,
    channel: conversation?.channel,
    jobId,
  };

  if (savedMessage?.direction !== 'inbound' || savedMessage?.sent_by !== 'customer') {
    console.log('AI_SKIPPED_REASON', JSON.stringify({ ...logContext, reason: 'not_customer_inbound' }));
    return;
  }

  if (conversation?.ai_mode !== 'auto') {
    console.log('AI_SKIPPED_REASON', JSON.stringify({
      ...logContext,
      reason: 'ai_mode_not_auto',
      aiMode: conversation?.ai_mode || 'manual',
    }));
    return;
  }

  const handoff = await getPendingHandoff(tenantId, conversation.id);
  if (handoff) {
    console.log('AI_SKIPPED_REASON', JSON.stringify({
      ...logContext,
      reason: 'pending_handoff',
      handoffId: handoff.id,
    }));
    return;
  }

  const text = String(suggestion?.suggested_reply || '').trim();
  if (!text) {
    console.log('AI_SKIPPED_REASON', JSON.stringify({ ...logContext, reason: 'empty_suggestion' }));
    return;
  }

  console.log('AI_TRIGGERED', JSON.stringify(logContext));

  let sendResult;
  try {
    sendResult = await sendAutoReplyToChannel({
      channel: conversation.channel,
      credentials,
      customer,
      text,
    });
  } catch (err) {
    console.log('AI_SKIPPED_REASON', JSON.stringify({
      ...logContext,
      reason: 'send_failed',
      error: err.message,
    }));
    return;
  }

  if (sendResult.status !== 'sent') {
    console.log('AI_SKIPPED_REASON', JSON.stringify({
      ...logContext,
      reason: sendResult.reason || 'send_not_supported',
    }));
    return;
  }

  const savedAiMessage = await saveMessage(tenantId, conversation.id, {
    direction: 'outbound',
    type: 'text',
    content: text,
    sent_by: 'ai',
    metadata: {
      ai_auto_reply: true,
      suggestion_id: suggestion.id || null,
      external_id: sendResult.externalId || null,
    },
  });

  try {
    const io = getIO();
    io.to(`tenant:${tenantId}:conversations`).emit('message:new', {
      message: savedAiMessage,
      conversation,
      customer,
      ai_auto_reply: true,
    });
  } catch {
    // Socket server is optional in tests and background workers.
  }

  console.log('AI_RESPONSE_GENERATED', JSON.stringify({
    ...logContext,
    responseMessageId: savedAiMessage.id,
    externalId: sendResult.externalId || null,
  }));
}

async function sendAutoReplyToChannel({ channel, credentials, customer, text }) {
  if (channel === 'whatsapp') {
    const { sendText } = require('../channels/whatsapp/sender');
    if (!credentials?.phone_number_id || !credentials?.access_token || !customer?.phone) {
      return { status: 'skipped', reason: 'missing_whatsapp_send_context' };
    }
    const response = await sendText(credentials.phone_number_id, credentials.access_token, customer.phone, text);
    return { status: 'sent', externalId: response?.messages?.[0]?.id || null };
  }

  if (channel === 'messenger') {
    const { sendText } = require('../channels/messenger/sender');
    if (!credentials?.page_id || !credentials?.access_token || !customer?.channel_customer_id) {
      return { status: 'skipped', reason: 'missing_messenger_send_context' };
    }
    const response = await sendText(credentials.page_id, credentials.access_token, customer.channel_customer_id, text);
    return { status: 'sent', externalId: response?.message_id || null };
  }

  if (channel === 'instagram') {
    const { sendText } = require('../channels/instagram/sender');
    const senderId = credentials?.instagram_business_account_id || credentials?.ig_user_id || credentials?.page_id;
    if (!senderId || !credentials?.access_token || !customer?.channel_customer_id) {
      return { status: 'skipped', reason: 'missing_instagram_send_context' };
    }
    const response = await sendText(senderId, credentials.access_token, customer.channel_customer_id, text);
    return { status: 'sent', externalId: response?.message_id || null };
  }

  if (channel === 'livechat') {
    const { sendText } = require('../channels/livechat/sender');
    if (customer?.channel_customer_id) {
      sendText(customer.channel_customer_id, text, 'ai');
    }
    return { status: 'sent', externalId: null };
  }

  return { status: 'skipped', reason: `unsupported_channel_${channel || 'unknown'}` };
}

async function processQueuedPayload(payload, jobId = 'inline') {
  if (payload?.already_saved) {
    return processSavedInboundMessage(payload, jobId);
  }
  return processMessage(payload, jobId);
}

async function addToQueue(payload) {
  if (payload?.already_saved) {
    await processSavedInboundMessage(payload);
    return;
  }

  if (payload?.channel === 'livechat') {
    await processMessage(payload);
    return;
  }

  const queue = getMessageQueue();
  if (!queue) {
    console.warn('[Worker] REDIS_URL not configured, processing inline');
    await processMessage(payload);
    return;
  }

  await queue.add('process', payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
}

// Worker (run separately via `npm run worker`)
if (require.main === module) {
  if (!hasRedisConfig()) {
    console.error('[Worker] REDIS_URL is required to run the queue worker');
    process.exit(1);
  }

  const worker = new Worker('messages', async (job) => processQueuedPayload(job.data, job.id), {
    connection: getQueueConnection(),
  });

  worker.on('completed', (job) => console.log(`[Worker] done:`, job.id));
  worker.on('failed', (job, err) => console.error(`[Worker] failed:`, job?.id, err.message));
  console.log('[Worker] Message processor running');
}

module.exports = { addToQueue, getMessageQueue, processMessage, processSavedInboundMessage };
