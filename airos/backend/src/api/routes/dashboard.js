const express = require('express');
const { requireRole } = require('../middleware/rbac');
const { getCache, setCache } = require('../../db/cache');

const router = express.Router();
const requireReadRole = requireRole('owner', 'admin', 'agent');
const IS_PERF_DEBUG = process.env.DEBUG_PERF === 'true';

// GET /api/dashboard — summary stats for today
router.get('/', requireReadRole, async (req, res, next) => {
  const startTime = Date.now();
  let cacheStatus = 'MISS';
  try {
    const { tenant_id } = req.user;
    const today = new Date().toISOString().slice(0, 10);

    // 1. Try cache first
    const cachedDashboard = await getCache(tenant_id, 'dashboard', 'summary');
    if (cachedDashboard) {
      cacheStatus = 'HIT';
      if (IS_PERF_DEBUG) {
        console.log(`[PERF:ENDPOINT] name=/api/dashboard tenant_id=${tenant_id} duration=${Date.now() - startTime}ms cache=${cacheStatus}`);
      }
      return res.json(cachedDashboard);
    }

    const [dealsRes, convRes, reportRes, trendRes, hotLeadRes, channelRes, aiUsageRes] = await Promise.all([
      req.db.query(`SELECT stage, COUNT(*) AS count FROM deals WHERE tenant_id = $1 GROUP BY stage`, [tenant_id]),
      req.db.query(`SELECT COUNT(*) AS open FROM conversations WHERE tenant_id = $1 AND status = 'open'`, [tenant_id]),
      req.db.query(`SELECT * FROM report_daily WHERE tenant_id = $1 AND date = $2 AND channel IS NULL`, [tenant_id, today]),
      req.db.query(`
        SELECT
          date,
          COALESCE(SUM(revenue_won), 0)::numeric AS revenue,
          COALESCE(SUM(deals_won), 0)::int AS deals_won
        FROM report_daily
        WHERE tenant_id = $1 AND date >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY date
        ORDER BY date ASC
      `, [tenant_id]),
      req.db.query(`
        SELECT
          d.id,
          d.intent,
          d.lead_score,
          COALESCE(d.estimated_value, 0)::numeric AS estimated_value,
          c.channel,
          c.updated_at,
          cu.name AS customer_name
        FROM deals d
        JOIN conversations c ON c.id = d.conversation_id
        JOIN customers cu ON cu.id = d.customer_id
        WHERE d.tenant_id = $1 AND d.stage NOT IN ('won', 'lost')
        ORDER BY d.lead_score DESC, c.updated_at DESC
        LIMIT 5
      `, [tenant_id]),
      req.db.query(`
        SELECT
          channel,
          COUNT(*)::int AS conversations
        FROM conversations
        WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY channel
        ORDER BY conversations DESC
      `, [tenant_id]),
      req.db.query(`
        SELECT
          COUNT(*)::int AS sent,
          COUNT(*) FILTER (WHERE was_used = TRUE)::int AS used
        FROM ai_suggestions
        WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
      `, [tenant_id]),
    ]);

    const todayRow = reportRes.rows[0] || {};
    const aiSent = Number(aiUsageRes.rows[0]?.sent || 0);
    const aiUsed = Number(aiUsageRes.rows[0]?.used || 0);

    const payload = {
      deals_by_stage: dealsRes.rows,
      open_conversations: parseInt(convRes.rows[0]?.open || 0),
      today: todayRow,
      trend: trendRes.rows.map((row) => ({
        date: row.date,
        revenue: Number(row.revenue || 0),
        dealsWon: Number(row.deals_won || 0),
      })),
      hot_leads: hotLeadRes.rows.map((row) => ({
        id: row.id,
        name: row.customer_name || 'Unknown customer',
        intent: row.intent || 'inquiry',
        score: Number(row.lead_score || 0),
        channel: row.channel,
        estimatedValue: Number(row.estimated_value || 0),
        updatedAt: row.updated_at,
      })),
      channels: channelRes.rows.map((row) => ({
        channel: row.channel,
        conversations: Number(row.conversations || 0),
      })),
      ai_usage: {
        sent: aiSent,
        used: aiUsed,
        rate: aiSent > 0 ? Number(((aiUsed / aiSent) * 100).toFixed(1)) : 0,
      },
    };

    // Cache the response for 60 seconds
    await setCache(tenant_id, 'dashboard', 'summary', payload, 60);

    if (IS_PERF_DEBUG) {
      console.log(`[PERF:ENDPOINT] name=/api/dashboard tenant_id=${tenant_id} duration=${Date.now() - startTime}ms cache=${cacheStatus}`);
    }

    res.json(payload);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
