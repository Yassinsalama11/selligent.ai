/**
 * Human correction loop — Task 2-C2.
 *
 * POST /v1/corrections
 *   Body: { messageId?, suggestionId?, editType: "edit"|"reject", originalReply, correctedReply? }
 *   Creates a ReplyCorrection row on the tenant's regional cluster.
 *   "edit"   — agent corrected the reply (correctedReply required)
 *   "reject" — agent rejected the reply with no replacement (e.g. escalated)
 *
 * GET /v1/corrections
 *   Lists recent corrections for this tenant.
 *   Query: limit, offset, editType
 *
 * GET /v1/corrections/:id
 *   Returns a single correction record.
 */
const express = require('express');
const { getPrismaForTenant } = require('@chatorai/db');

const router = express.Router();

// POST /v1/corrections
router.post('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { messageId, suggestionId, editType, originalReply, correctedReply } = req.body || {};

    if (!editType || !['edit', 'reject'].includes(editType)) {
      return res.status(400).json({ error: 'editType must be "edit" or "reject"' });
    }
    if (!originalReply || typeof originalReply !== 'string') {
      return res.status(400).json({ error: 'originalReply is required' });
    }
    if (editType === 'edit' && (!correctedReply || typeof correctedReply !== 'string')) {
      return res.status(400).json({ error: 'correctedReply is required for editType "edit"' });
    }

    const prisma = await getPrismaForTenant(tenantId);
    const correction = await prisma.replyCorrection.create({
      data: {
        tenantId,
        messageId: messageId || null,
        suggestionId: suggestionId || null,
        editType,
        originalReply,
        correctedReply: correctedReply || null,
        correctedBy: req.user.id,
      },
    });

    res.status(201).json(correction);
  } catch (err) {
    next(err);
  }
});

// GET /v1/corrections
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const editType = req.query.editType;

    const prisma = await getPrismaForTenant(tenantId);
    const where = {
      tenantId,
      ...(editType ? { editType } : {}),
    };

    const [corrections, total] = await Promise.all([
      prisma.replyCorrection.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.replyCorrection.count({ where }),
    ]);

    res.json({ corrections, pagination: { limit, offset, total } });
  } catch (err) {
    next(err);
  }
});

// GET /v1/corrections/:id
router.get('/:id', async (req, res, next) => {
  try {
    const prisma = await getPrismaForTenant(req.user.tenant_id);
    const correction = await prisma.replyCorrection.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenant_id },
    });
    if (!correction) return res.status(404).json({ error: 'Correction not found' });
    res.json(correction);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
