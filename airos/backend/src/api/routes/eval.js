/**
 * Eval dashboard routes — Task 2-C1.
 *
 * GET /v1/eval/tenant/:id
 *   Returns recent eval scores for a tenant with pass-rate summary.
 *   Query params: limit (default 50), offset (default 0), since (ISO date)
 *
 * GET /v1/eval/scores/:scoreId
 *   Returns a single eval score record.
 */
const express = require('express');
const { withTenant } = require('@chatorai/db');

const router = express.Router();

// GET /v1/eval/tenant/:id
router.get('/tenant/:id', async (req, res, next) => {
  try {
    const tenantId = req.params.id;
    // Tenant may only view their own data unless platform admin
    if (req.user.tenant_id !== tenantId && req.user.role !== 'platform_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const since = req.query.since ? new Date(req.query.since) : undefined;

    const where = {
      tenantId,
      ...(since ? { createdAt: { gte: since } } : {}),
    };

    const { scores, total, passCount } = await withTenant(tenantId, async (tx) => {
      const [scores, total, passCount] = await Promise.all([
        tx.messageEvalScore.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          select: {
            id: true,
            messageId: true,
            score: true,
            pass: true,
            reasoning: true,
            model: true,
            latencyMs: true,
            createdAt: true,
          },
        }),
        tx.messageEvalScore.count({ where }),
        tx.messageEvalScore.count({ where: { ...where, pass: true } }),
      ]);
      return { scores, total, passCount };
    });

    const passRate = total > 0 ? Math.round((passCount / total) * 100) : null;
    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length)
        : null;

    res.json({
      tenantId,
      summary: { total, passCount, passRate, avgScore },
      scores,
      pagination: { limit, offset, total },
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/eval/scores/:scoreId
router.get('/scores/:scoreId', async (req, res, next) => {
  try {
    const score = await withTenant(req.user.tenant_id, async (tx) => {
      return tx.messageEvalScore.findFirst({
        where: { id: req.params.scoreId, tenantId: req.user.tenant_id },
      });
    });
    if (!score) return res.status(404).json({ error: 'Score not found' });
    res.json(score);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
