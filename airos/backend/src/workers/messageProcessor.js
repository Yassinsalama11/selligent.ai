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
  const { normalizeTenantSettings: normSettings } = require('../core/tenantSettings');
  const tenantSettings = normSettings(tenantRow?.settings);
  const deal = tenantSettings.global?.autoCreateLead !== false
    ? await getOrCreateDeal(tenantId, conversation.id, customer.id)
    : null;

  // Auto-assign if conversation still unassigned (skipped by the already_saved path)
  if (!conversation.assigned_to) {
    const { determineAssignee, checkSLABreach } = require('../core/messageRouter');
    const { assignConversation } = require('../db/queries/conversations');
    try {
      const assigneeId = await determineAssignee(tenantId, tenantSettings, {
        conversation,
        customer,
        message: { type: savedMessage.type, content: savedMessage.content },
        ticket,
        deal,
      });
      if (assigneeId) {
        const assigned = await assignConversation(tenantId, conversation.id, assigneeId);
        if (assigned) Object.assign(conversation, assigned);
      }
    } catch (err) {
      console.warn('[Worker] Assignment failed (non-fatal):', err.message);
    }

    // Schedule SLA breach check
    const channelSlaCfg = tenantSettings?.channels?.[conversation.channel];
    const slaTargetMinutes = Number(channelSlaCfg?.slaTargetMinutes || 0);
    if (slaTargetMinutes > 0 && savedMessage?.id) {
      setTimeout(() => {
        checkSLABreach(tenantId, conversation.id, conversation.channel, savedMessage.id, slaTargetMinutes).catch(() => {});
      }, slaTargetMinutes * 60 * 1000);
    }
  }

  try {
    await maybeSendChannelGreeting({
      tenantId,
      conversation,
      customer,
      savedMessage,
      credentials: payload.credentials,
      tenantSettings,
    });
  } catch (err) {
    console.warn('[Worker] Greeting failed (non-fatal):', err.message);
  }

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
  const { sendFailedTriggerAlert } = require('../services/email/emailService');
  const { normalizeTenantSettings, isWithinWorkingHours } = require('../core/tenantSettings');
  const {
    getAiTimeBehavior,
    matchesSilentModeConditions,
    countConsecutiveAiFailures,
    evaluateHandoffRules,
  } = require('../ai/policyEngine');

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

  const messageText = String(unified.message.content || unified.message.media_url || '').trim();
  const tenantSettings = normalizeTenantSettings(tenantRow?.settings);
  const channelCfg = tenantSettings?.channels?.[conversation?.channel];

  const conversationInAutoMode = conversation?.ai_mode === 'auto';

  if (!conversationInAutoMode && channelCfg?.aiEnabled === false) {
    console.log('AI_SKIPPED_REASON', JSON.stringify({
      tenantId,
      conversationId: conversation?.id,
      messageId: savedMessage?.id,
      channel: conversation?.channel,
      jobId,
      reason: 'channel_ai_disabled',
    }));
    return;
  }

  const aiTimeBehavior = getAiTimeBehavior(
    tenantSettings.aiConfig?.responseControl,
    tenantSettings.global,
    new Date(),
    isWithinWorkingHours,
  );
  if (!conversationInAutoMode && aiTimeBehavior === 'off') {
    console.log('AI_SKIPPED_REASON', JSON.stringify({
      tenantId,
      conversationId: conversation?.id,
      messageId: savedMessage?.id,
      channel: conversation?.channel,
      jobId,
      reason: 'ai_time_behavior_off',
    }));
    return;
  }

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
    console.error('[Worker] Intent detection failed (using fallback):', err.message);
    analysis = { intent: 'general', sentiment: 'neutral', lead_score: 30, language: 'arabic', suggested_stage: null };
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
      history,
      currentMessageAt: savedMessage.created_at,
    }
  );
  analysis.lead_score = final_score;
  analysis.probability = probability;

  // Apply minScoreForQualification: if score meets threshold and stage is still new_lead, promote to engaged
  const tenantGlobal = tenantSettings.global;
  const minQualScore = tenantGlobal?.minScoreForQualification != null
    ? Number(tenantGlobal.minScoreForQualification)
    : null;
  if (
    minQualScore !== null
    && Number.isFinite(minQualScore)
    && final_score >= minQualScore
    && (!analysis.suggested_stage || analysis.suggested_stage === 'new_lead')
  ) {
    analysis.suggested_stage = 'engaged';
  }

  const responseControl = tenantSettings.aiConfig?.responseControl || {};
  const silentMatch = matchesSilentModeConditions(responseControl.silentModeConditions, {
    channel: conversation.channel,
    customer,
    intent: analysis.intent,
    sentiment: analysis.sentiment,
  });
  if (silentMatch) {
    console.log('AI_SKIPPED_REASON', JSON.stringify({
      tenantId,
      conversationId: conversation?.id,
      messageId: savedMessage?.id,
      channel: conversation?.channel,
      jobId,
      reason: 'silent_mode_condition_matched',
      condition: silentMatch,
    }));
    return;
  }

  const handoffRuleMatch = evaluateHandoffRules(tenantSettings.aiConfig?.handoffRules, {
    channel: conversation.channel,
    customer,
    intent: analysis.intent,
    leadScore: final_score,
    text: messageText,
    consecutiveFailures: countConsecutiveAiFailures(history),
  });
  if (handoffRuleMatch) {
    console.log('AI_SKIPPED_REASON', JSON.stringify({
      tenantId,
      conversationId: conversation?.id,
      messageId: savedMessage?.id,
      channel: conversation?.channel,
      jobId,
      reason: 'handoff_rule_matched',
      rule: handoffRuleMatch.rule?.id || handoffRuleMatch.rule?.condition || null,
    }));
    return;
  }

  // 5. Advance deal stage (skipped when autoCreateLead is off and no deal exists)
  const updatedDeal = deal?.id ? await advanceDeal(tenantId, deal.id, analysis) : null;

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
      channel: conversation.channel,
    });
  } catch (err) {
    console.error('[Worker] Reply generation failed:', err.message);
    suggestion = null;
  }

  await maybeSendAutoReply({
    tenantId,
    conversation,
    customer,
    savedMessage,
    suggestion,
    credentials,
    jobId,
    tenantSettings,
    history,
    aiTimeBehavior,
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
      deal: updatedDeal || deal,
      previousDeal: deal,
      historyLength: history.length,
    });
  } catch (err) {
    console.error('[Worker] Trigger execution failed:', err.message);
    sendFailedTriggerAlert({
      tenantId,
      triggerName: 'message processing trigger execution',
      errorSummary: err.message,
    }).catch(() => {});
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
    `[Worker] Done — intent: ${analysis.intent}, score: ${final_score}, stage: ${(updatedDeal || deal)?.stage || 'none'}`
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
  tenantSettings,
  history = [],
  aiTimeBehavior = 'auto',
}) {
  const { getPendingHandoff } = require('../db/queries/handoffs');
  const { saveMessage } = require('../db/queries/messages');
  const { getIO } = require('../channels/livechat/socket');
  const {
    countConsecutiveAiAutoReplies,
    countConsecutiveAiFailures,
  } = require('../ai/policyEngine');

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

  const globalSettings = tenantSettings?.global || {};
  const aiConfig = tenantSettings?.aiConfig || {};
  const conversationAutoMode = conversation?.ai_mode === 'auto';
  const channelCfg = tenantSettings?.channels?.[conversation?.channel];
  const responseControl = aiConfig.responseControl || {};

  // When ai_mode=auto the agent has explicitly enabled autonomous replies for this conversation.
  // Only check gates that make sense regardless of intent: in manual/suggest mode ALL gates apply.
  if (!conversationAutoMode) {
    if (globalSettings.aiEnabled === false) {
      console.log('AI_SKIPPED_REASON', JSON.stringify({ ...logContext, reason: 'global_ai_disabled' }));
      return;
    }
    if (aiConfig.autoReply === false) {
      console.log('AI_SKIPPED_REASON', JSON.stringify({ ...logContext, reason: 'global_auto_reply_disabled' }));
      return;
    }
    if (aiConfig.suggestOnly === true) {
      console.log('AI_SKIPPED_REASON', JSON.stringify({ ...logContext, reason: 'global_suggest_only' }));
      return;
    }
    if (aiTimeBehavior === 'suggest') {
      console.log('AI_SKIPPED_REASON', JSON.stringify({ ...logContext, reason: 'ai_time_behavior_suggest_only' }));
      return;
    }
    if (globalSettings.humanApprovalRequired === true) {
      console.log('AI_SKIPPED_REASON', JSON.stringify({ ...logContext, reason: 'global_human_approval_required' }));
      return;
    }
    if (channelCfg?.aiEnabled === false) {
      console.log('AI_SKIPPED_REASON', JSON.stringify({ ...logContext, reason: 'channel_ai_disabled' }));
      return;
    }
    if (channelCfg?.requireApproval === true) {
      console.log('AI_SKIPPED_REASON', JSON.stringify({ ...logContext, reason: 'channel_requires_approval' }));
      return;
    }
    if (channelCfg?.suggestOnly === true) {
      console.log('AI_SKIPPED_REASON', JSON.stringify({ ...logContext, reason: 'channel_suggest_only' }));
      return;
    }
    const maxConsecutiveReplies = Number(responseControl.maxConsecutiveReplies ?? 5);
    if (Number.isFinite(maxConsecutiveReplies) && maxConsecutiveReplies > 0) {
      const consecutiveAiReplies = countConsecutiveAiAutoReplies(history);
      if (consecutiveAiReplies >= maxConsecutiveReplies) {
        console.log('AI_SKIPPED_REASON', JSON.stringify({ ...logContext, reason: 'max_consecutive_ai_replies_reached', consecutiveAiReplies, maxConsecutiveReplies }));
        return;
      }
    }
    const failedReplyThreshold = Number(responseControl.escalationThreshold ?? 3);
    if (Number.isFinite(failedReplyThreshold) && failedReplyThreshold > 0) {
      const consecutiveFailures = countConsecutiveAiFailures(history);
      if (consecutiveFailures >= failedReplyThreshold) {
        console.log('AI_SKIPPED_REASON', JSON.stringify({ ...logContext, reason: 'ai_failed_reply_threshold_reached', consecutiveFailures, failedReplyThreshold }));
        return;
      }
    }
    const handoff = await getPendingHandoff(tenantId, conversation.id);
    if (handoff) {
      console.log('AI_SKIPPED_REASON', JSON.stringify({ ...logContext, reason: 'pending_handoff', handoffId: handoff.id }));
      return;
    }
  }

  const text = String(suggestion?.suggested_reply || '').trim();
  if (!text) {
    const fallback = String(
      channelCfg?.fallbackReply ||
      aiConfig?.fallbackReply ||
      (conversationAutoMode ? 'Thank you for your message. Our team will get back to you shortly.' : '')
    ).trim();
    if (fallback) {
      try {
        const fallbackSend = await sendAutoReplyToChannel({ channel: conversation.channel, credentials, customer, text: fallback });
        if (fallbackSend.status === 'sent') {
          const fallbackMsg = await saveMessage(tenantId, conversation.id, {
            direction: 'outbound', type: 'text', content: fallback, sent_by: 'ai',
            metadata: { ai_auto_reply: true, is_fallback_reply: true, external_id: fallbackSend.externalId || null },
          });
          try {
            const io = getIO();
            io.to(`tenant:${tenantId}:conversations`).emit('message:new', {
              message: fallbackMsg,
              conversation: { id: conversation.id, tenant_id: tenantId },
              customer,
            });
          } catch {}
        }
      } catch (err) {
        console.warn('[Worker] Fallback reply send failed (non-fatal):', err.message);
      }
    }
    console.log('AI_SKIPPED_REASON', JSON.stringify({ ...logContext, reason: 'empty_suggestion' }));
    return;
  }

  // Confidence threshold gate — bypassed when agent explicitly enabled auto mode
  if (!conversationAutoMode) {
    const confidenceThreshold = channelCfg?.confidenceThreshold != null
      ? Number(channelCfg.confidenceThreshold)
      : Number(tenantSettings?.aiConfig?.responseControl?.confidenceThreshold ?? 50);
    const suggestionConfidence = suggestion?.confidence != null ? Number(suggestion.confidence) * 100 : null;
    if (suggestionConfidence !== null && suggestionConfidence < confidenceThreshold) {
      console.log('AI_SKIPPED_REASON', JSON.stringify({
        ...logContext,
        reason: 'below_confidence_threshold',
        confidence: suggestionConfidence,
        threshold: confidenceThreshold,
      }));
      return;
    }
  }

  // Escalation threshold — bypassed in auto mode (agent made a conscious decision to auto-reply)
  const escalationThreshold = !conversationAutoMode && globalSettings.aiEscalationThreshold != null
    ? Number(globalSettings.aiEscalationThreshold)
    : null;
  if (escalationThreshold !== null && Number.isFinite(escalationThreshold)) {
    const leadScore = suggestion?.lead_score ?? null;
    if (leadScore !== null && Number(leadScore) >= escalationThreshold) {
      console.log('AI_SKIPPED_REASON', JSON.stringify({
        ...logContext,
        reason: 'lead_score_exceeds_escalation_threshold',
        leadScore,
        escalationThreshold,
      }));
      return;
    }
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
    try {
      await saveMessage(tenantId, conversation.id, {
        direction: 'outbound',
        type: 'text',
        content: text,
        sent_by: 'ai',
        metadata: {
          ai_auto_reply: true,
          send_status: 'failed',
          send_error: err.message,
          suggestion_id: suggestion?.id || null,
        },
      });
    } catch {}
    console.log('AI_SKIPPED_REASON', JSON.stringify({
      ...logContext,
      reason: 'send_failed',
      error: err.message,
    }));
    return;
  }

  if (sendResult.status !== 'sent') {
    if (sendResult.reason) {
      try {
        await saveMessage(tenantId, conversation.id, {
          direction: 'outbound',
          type: 'text',
          content: text,
          sent_by: 'ai',
          metadata: {
            ai_auto_reply: true,
            send_status: 'skipped',
            send_error: sendResult.reason,
            suggestion_id: suggestion?.id || null,
          },
        });
      } catch {}
    }
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

async function maybeSendChannelGreeting({
  tenantId,
  conversation,
  customer,
  savedMessage,
  credentials,
  tenantSettings,
}) {
  const { queryAdmin } = require('../db/pool');
  const { saveMessage } = require('../db/queries/messages');
  const { getIO } = require('../channels/livechat/socket');
  const { getChannelGreetingText } = require('../core/tenantSettings');

  if (conversation?.channel === 'livechat') return;
  if (savedMessage?.direction !== 'inbound' || savedMessage?.sent_by !== 'customer') return;

  const inboundCount = await queryAdmin(
    `SELECT COUNT(*)::int AS count
     FROM messages
     WHERE tenant_id = $1
       AND conversation_id = $2
       AND direction = 'inbound'
       AND sent_by = 'customer'`,
    [tenantId, conversation.id]
  ).then((result) => result.rows[0]?.count || 0);

  if (Number(inboundCount) !== 1) return;

  const { text: greetingText, businessHoursMode, withinHours } = getChannelGreetingText(tenantSettings, conversation.channel);
  if (!greetingText) return;

  const sendResult = await sendAutoReplyToChannel({
    channel: conversation.channel,
    credentials,
    customer,
    text: greetingText,
  });

  if (sendResult.status !== 'sent') return;

  const greetingMessage = await saveMessage(tenantId, conversation.id, {
    direction: 'outbound',
    type: 'text',
    content: greetingText,
    sent_by: 'ai',
    metadata: {
      is_greeting: true,
      auto_sent: true,
      business_hours_mode: businessHoursMode,
      within_hours: withinHours,
      external_id: sendResult.externalId || null,
    },
  });

  try {
    const io = getIO();
    io.to(`tenant:${tenantId}:conversations`).emit('message:new', {
      message: greetingMessage,
      conversation,
      customer,
      ai_auto_reply: true,
      is_greeting: true,
    });
  } catch {
    // Socket server is optional in tests and background workers.
  }
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
    const { sendText, resolveSenderId } = require('../channels/instagram/sender');
    const senderId = resolveSenderId(credentials);
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
    console.warn('[Worker] REDIS_URL not configured, processing async');
    setImmediate(() => processMessage(payload).catch(err => console.error('[Worker] Inline process failed:', err.message)));
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

function startMessageWorker() {
  if (!hasRedisConfig()) {
    console.warn('[MessageWorker] REDIS_URL not configured, skipping');
    return null;
  }
  const worker = new Worker('messages', async (job) => processQueuedPayload(job.data, job.id), {
    connection: getQueueConnection(),
    concurrency: 5,
  });
  worker.on('completed', (job) => console.log(`[MessageWorker] done:`, job.id));
  worker.on('failed', (job, err) => console.error(`[MessageWorker] failed:`, job?.id, err.message));
  console.log('[MessageWorker] BullMQ worker started');
  return worker;
}

module.exports = { addToQueue, getMessageQueue, processMessage, processSavedInboundMessage, startMessageWorker };
