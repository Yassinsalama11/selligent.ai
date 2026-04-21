'use strict';
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { requireRole } = require('../middleware/rbac');
const {
  createHandoff,
  getPendingHandoff,
  getHandoff,
  resolveHandoff,
  updateHandoffSummary,
} = require('../../db/queries/handoffs');
const { assignConversation } = require('../../db/queries/conversations');
const { emitToTenantConversations } = require('../../channels/livechat/socket');

const router = express.Router({ mergeParams: true }); // inherits :id from parent
const requireAny = requireRole('owner', 'admin', 'agent');
const requireElevated = requireRole('owner', 'admin');

// ── helpers ──────────────────────────────────────────────────────────────────

async function canAccessConversation(req, conversationId) {
  const params = [conversationId, req.user.tenant_id];
  const conditions = ['id = $1', 'tenant_id = $2'];
  if (req.user.role === 'agent') {
    params.push(req.user.id);
    conditions.push(`(assigned_to = $${params.length} OR assigned_to IS NULL)`);
  }
  const result = await req.db.query(
    `SELECT id FROM conversations WHERE ${conditions.join(' AND ')} LIMIT 1`,
    params
  );
  return Boolean(result.rows[0]);
}

function canResolveHandoff(user, handoff) {
  if (user.role === 'owner' || user.role === 'admin') return true;
  // requester cannot accept/decline their own request
  if (String(handoff.requested_by) === String(user.id)) return false;
  // open handoff (any agent) or targeted to this agent
  return !handoff.requested_to || String(handoff.requested_to) === String(user.id);
}

// Fire-and-forget — generates a 2-3 sentence conversation summary via claude-haiku
// Updates the handoff record with the summary; fails silently.
async function attachAiSummary(tenantId, handoffId, messages) {
  if (!process.env.ANTHROPIC_API_KEY || !messages?.length) return;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const transcript = messages
      .slice(-12)
      .map(m => `${m.sent_by === 'customer' ? 'Customer' : 'Agent'}: ${m.content || ''}`)
      .filter(line => line.length > 12)
      .join('\n');

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Summarize this support conversation in 2-3 sentences for the agent taking over. Be factual, do not invent details not in the transcript.\n\n${transcript}`,
      }],
    });

    const summary = response.content?.[0]?.text?.trim();
    if (summary) await updateHandoffSummary(tenantId, handoffId, summary);
  } catch {
    // fail silently — summary is best-effort
  }
}

// ── routes ───────────────────────────────────────────────────────────────────

// POST /api/conversations/:id/handoff
// Any role may request a handoff on a conversation they can access.
router.post('/', requireAny, async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    const tenantId = req.user.tenant_id;

    const allowed = await canAccessConversation(req, conversationId);
    if (!allowed) return res.status(404).json({ error: 'Conversation not found' });

    // Reject if a pending handoff already exists for this conversation
    const existing = await getPendingHandoff(tenantId, conversationId, req.db);
    if (existing) return res.status(409).json({ error: 'A pending handoff already exists', handoff: existing });

    const { requested_to, reason } = req.body;

    // If requested_to is set, validate it belongs to the same tenant
    if (requested_to) {
      const target = await req.db.query(
        'SELECT id FROM users WHERE id = $1 AND tenant_id = $2 LIMIT 1',
        [requested_to, tenantId]
      );
      if (!target.rows[0]) return res.status(400).json({ error: 'requested_to user not found in this tenant' });
    }

    const handoff = await createHandoff(
      tenantId, conversationId, req.user.id, requested_to || null, reason || '', req.db
    );

    emitToTenantConversations(tenantId, 'agent:handoff_requested', {
      handoff,
      conversation_id: conversationId,
    });

    // Generate AI summary in the background — fetch recent messages then call AI
    req.db.query(
      `SELECT content, sent_by FROM messages
       WHERE tenant_id = $1 AND conversation_id = $2
       ORDER BY created_at DESC LIMIT 12`,
      [tenantId, conversationId]
    ).then(r => attachAiSummary(tenantId, handoff.id, r.rows.reverse())).catch(() => {});

    res.status(201).json({ handoff });
  } catch (err) { next(err); }
});

// GET /api/conversations/:id/handoff
// Returns the current pending handoff for this conversation, or 404.
router.get('/', requireAny, async (req, res, next) => {
  try {
    const allowed = await canAccessConversation(req, req.params.id);
    if (!allowed) return res.status(404).json({ error: 'Conversation not found' });

    const handoff = await getPendingHandoff(req.user.tenant_id, req.params.id, req.db);
    if (!handoff) return res.status(404).json({ error: 'No pending handoff' });
    res.json({ handoff });
  } catch (err) { next(err); }
});

// POST /api/conversations/:id/handoff/:handoffId/accept
router.post('/:handoffId/accept', requireAny, async (req, res, next) => {
  try {
    const { id: conversationId, handoffId } = req.params;
    const tenantId = req.user.tenant_id;

    const handoff = await getHandoff(tenantId, handoffId, req.db);
    if (!handoff || handoff.conversation_id !== conversationId) {
      return res.status(404).json({ error: 'Handoff not found' });
    }
    if (handoff.status !== 'pending') {
      return res.status(409).json({ error: `Handoff is already ${handoff.status}` });
    }
    if (!canResolveHandoff(req.user, handoff)) {
      return res.status(403).json({ error: 'You are not authorized to accept this handoff' });
    }

    const resolved = await resolveHandoff(tenantId, handoffId, 'accepted', req.user.id, req.db);
    const conversation = await assignConversation(tenantId, conversationId, req.user.id, req.db);

    emitToTenantConversations(tenantId, 'agent:handoff_accepted', {
      handoff: resolved,
      conversation_id: conversationId,
      accepted_by: req.user.id,
    });
    emitToTenantConversations(tenantId, 'conversation:handoff_status', {
      conversation_id: conversationId,
      status: 'accepted',
      handoff: resolved,
    });

    res.json({ handoff: resolved, conversation });
  } catch (err) { next(err); }
});

// POST /api/conversations/:id/handoff/:handoffId/decline
router.post('/:handoffId/decline', requireAny, async (req, res, next) => {
  try {
    const { id: conversationId, handoffId } = req.params;
    const tenantId = req.user.tenant_id;

    const handoff = await getHandoff(tenantId, handoffId, req.db);
    if (!handoff || handoff.conversation_id !== conversationId) {
      return res.status(404).json({ error: 'Handoff not found' });
    }
    if (handoff.status !== 'pending') {
      return res.status(409).json({ error: `Handoff is already ${handoff.status}` });
    }
    if (!canResolveHandoff(req.user, handoff)) {
      return res.status(403).json({ error: 'You are not authorized to decline this handoff' });
    }

    const resolved = await resolveHandoff(tenantId, handoffId, 'declined', req.user.id, req.db);

    emitToTenantConversations(tenantId, 'agent:handoff_declined', {
      handoff: resolved,
      conversation_id: conversationId,
      declined_by: req.user.id,
    });
    emitToTenantConversations(tenantId, 'conversation:handoff_status', {
      conversation_id: conversationId,
      status: 'declined',
      handoff: resolved,
    });

    res.json({ handoff: resolved });
  } catch (err) { next(err); }
});

// DELETE /api/conversations/:id/handoff/:handoffId  (cancel — requester or elevated)
router.delete('/:handoffId', requireAny, async (req, res, next) => {
  try {
    const { id: conversationId, handoffId } = req.params;
    const tenantId = req.user.tenant_id;

    const handoff = await getHandoff(tenantId, handoffId, req.db);
    if (!handoff || handoff.conversation_id !== conversationId) {
      return res.status(404).json({ error: 'Handoff not found' });
    }
    if (handoff.status !== 'pending') {
      return res.status(409).json({ error: `Handoff is already ${handoff.status}` });
    }
    const isRequester = String(handoff.requested_by) === String(req.user.id);
    const isElevated = req.user.role === 'owner' || req.user.role === 'admin';
    if (!isRequester && !isElevated) {
      return res.status(403).json({ error: 'Only the requester or an admin can cancel this handoff' });
    }

    const resolved = await resolveHandoff(tenantId, handoffId, 'cancelled', req.user.id, req.db);

    emitToTenantConversations(tenantId, 'conversation:handoff_status', {
      conversation_id: conversationId,
      status: 'cancelled',
      handoff: resolved,
    });

    res.json({ handoff: resolved });
  } catch (err) { next(err); }
});

module.exports = router;
