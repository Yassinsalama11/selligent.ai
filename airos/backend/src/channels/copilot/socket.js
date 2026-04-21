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
const { validateTenant } = require('../livechat/socket');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readHandshakeValue(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readHandshakeToken(socket) {
  return readHandshakeValue(socket.handshake.auth?.token) || readHandshakeValue(socket.handshake.query?.token);
}

function normalizeTenantId(tenantId) {
  if (!tenantId || !UUID_RE.test(tenantId)) {
    return null;
  }

  return tenantId;
}

/**
 * Attach the /copilot namespace to a Socket.IO Server instance.
 * Call after initSocketServer().
 *
 * @param {import('socket.io').Server} io
 */
function initCopilotNamespace(io) {
  const nsp = io.of('/copilot');

  // JWT auth middleware
  nsp.use(async (socket, next) => {
    const token = readHandshakeToken(socket);
    if (!token) return next(new Error('UNAUTHORIZED'));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'chatorai-secret');
      const tenantId = normalizeTenantId(payload.tenant_id || payload.tenantId);
      const userId = payload.id || payload.userId || payload.sub;

      if (!tenantId || !userId) {
        return next(new Error('UNAUTHORIZED'));
      }

      if (!(await validateTenant(tenantId))) {
        return next(new Error('UNAUTHORIZED'));
      }

      socket.data.userId = userId;
      socket.data.tenantId = tenantId;
      socket.data.role = payload.role || null;
      socket.data.authenticated = true;
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
