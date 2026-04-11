const express = require('express');
const { query } = require('../../db/pool');

const router = express.Router();

// GET /api/dashboard — summary stats for today
router.get('/', async (req, res, next) => {
  try {
    const { tenant_id } = req.user;
    const today = new Date().toISOString().slice(0, 10);

    const [dealsRes, convRes, reportRes] = await Promise.all([
      query(`SELECT stage, COUNT(*) AS count FROM deals WHERE tenant_id = $1 GROUP BY stage`, [tenant_id]),
      query(`SELECT COUNT(*) AS open FROM conversations WHERE tenant_id = $1 AND status = 'open'`, [tenant_id]),
      query(`SELECT * FROM report_daily WHERE tenant_id = $1 AND date = $2 AND channel IS NULL`, [tenant_id, today]),
    ]);

    res.json({
      deals_by_stage: dealsRes.rows,
      open_conversations: parseInt(convRes.rows[0]?.open || 0),
      today: reportRes.rows[0] || {},
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
