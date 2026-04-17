/**
 * Agent Copilot — Socket.IO namespace handler — Task 3-C2.
 *
 * Namespace: /copilot
 *
 * Client connects with:
 *   const socket = io('/copilot', { auth: { token: '<jwt>' } });
 *
 * Events client → server:
 *   copilot:request  { command, draft?, history?, conversationId?, language?, tone?, targetLanguage? }
 *
 * Events server → client:
 *   copilot:chunk    { delta: string }                     — streaming text chunk
 *   copilot:done     { text: string, latencyMs: number }   — terminal event
 *   copilot:error    { message: string }
 *
 * Events client → server (outcome logging):
 *   copilot:outcome  { requestId, outcome: "accepted"|"edited"|"rejected", editedText? }
 */
const jwt = require('jsonwebtoken');
const { streamCopilotSuggestion, logCopilotOutcome } = require('@chatorai/ai-core').copilot;
const { logger } = require('../../core/logger');

/**
 * Attach the /copilot namespace to a Socket.IO Server instance.
 * Call after initSocketServer().
 *
 * @param {import('socket.io').Server} io
 */
function initCopilotNamespace(io) {
  const nsp = io.of('/copilot');

  // JWT auth middleware
  nsp.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('UNAUTHORIZED'));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.userId   = payload.id   || payload.sub;
      socket.data.tenantId = payload.tenant_id;
      socket.data.role     = payload.role;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  nsp.on('connection', (socket) => {
    const { tenantId, userId } = socket.data;
    logger.debug('[Copilot] agent connected', { tenantId, userId, socketId: socket.id });

    // Track active streaming AbortController per socket
    const _active = new Map(); // requestId → AbortController

    socket.on('copilot:request', async (payload) => {
      const {
        requestId = `req_${Date.now()}`,
        command,
        draft,
        history,
        conversationId,
        language,
        targetLanguage,
        tone,
        businessContext,
      } = payload || {};

      // Abort any in-flight request for this requestId
      if (_active.has(requestId)) {
        _active.get(requestId).abort();
        _active.delete(requestId);
      }

      let fullText = '';
      let latencyMs = 0;

      try {
        for await (const chunk of streamCopilotSuggestion({
          tenantId,
          command,
          draft,
          history,
          customer: null, // could be fetched if conversationId provided
          language,
          targetLanguage,
          tone,
          businessContext,
        })) {
          if (chunk.type === 'text') {
            socket.emit('copilot:chunk', { requestId, delta: chunk.delta });
          } else if (chunk.type === 'done') {
            fullText  = chunk.text;
            latencyMs = chunk.latencyMs;
          }
        }

        socket.emit('copilot:done', { requestId, text: fullText, latencyMs });
      } catch (err) {
        socket.emit('copilot:error', { requestId, message: err.message });
      } finally {
        _active.delete(requestId);
      }

      // Store pending outcome for this requestId
      socket.data[`pending_${requestId}`] = {
        suggestion: fullText,
        command,
        conversationId,
        latencyMs,
      };
    });

    socket.on('copilot:outcome', async ({ requestId, outcome, editedText }) => {
      const pending = socket.data[`pending_${requestId}`];
      if (!pending) return;
      delete socket.data[`pending_${requestId}`];

      logCopilotOutcome({
        tenantId,
        agentId: userId,
        conversationId: pending.conversationId || null,
        command: pending.command,
        suggestion: pending.suggestion,
        outcome: outcome || 'ignored',
        editedText: editedText || null,
        latencyMs: pending.latencyMs,
      }).catch(() => {});
    });

    socket.on('disconnect', () => {
      logger.debug('[Copilot] agent disconnected', { tenantId, userId });
    });
  });

  return nsp;
}

module.exports = { initCopilotNamespace };
