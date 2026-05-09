const { queryAdmin } = require('../pool');

function normalizeDateRange(from, to) {
  return {
    from: from || '2000-01-01',
    to: to || new Date().toISOString().slice(0, 10),
  };
}

async function getRevenueReport(tenantId, { from, to, channel, agent } = {}, client) {
  const range = normalizeDateRange(from, to);
  const params = [tenantId, range.from, range.to];
  let channelFilter = '';
  if (channel) { params.push(channel); channelFilter = `AND channel = $${params.length}`; }

  const res = client
    ? await client.query(`
    SELECT date, channel,
      SUM(revenue_won) AS revenue,
      SUM(deals_won) AS deals_won,
      SUM(deals_lost) AS deals_lost,
      AVG(avg_lead_score) AS avg_lead_score
    FROM report_daily
    WHERE tenant_id = $1 AND date BETWEEN $2 AND $3 ${channelFilter}
    GROUP BY date, channel ORDER BY date
  `, params)
    : await queryAdmin(`
    SELECT date, channel,
      SUM(revenue_won) AS revenue,
      SUM(deals_won) AS deals_won,
      SUM(deals_lost) AS deals_lost,
      AVG(avg_lead_score) AS avg_lead_score
    FROM report_daily
    WHERE tenant_id = $1 AND date BETWEEN $2 AND $3 ${channelFilter}
    GROUP BY date, channel ORDER BY date
  `, params);

  return res.rows;
}

async function getConversionReport(tenantId, { from, to, channel } = {}, client) {
  const range = normalizeDateRange(from, to);
  const params = [tenantId, range.from, range.to];
  let channelFilter = '';
  if (channel) { params.push(channel); channelFilter = `AND channel = $${params.length}`; }

  const res = client
    ? await client.query(`
    SELECT
      SUM(total_conversations) AS total_conversations,
      SUM(new_leads) AS new_leads,
      SUM(deals_won) AS deals_won,
      SUM(deals_lost) AS deals_lost,
      AVG(conversion_rate) AS avg_conversion_rate
    FROM report_daily
    WHERE tenant_id = $1 AND date BETWEEN $2 AND $3 ${channelFilter}
  `, params)
    : await queryAdmin(`
    SELECT
      SUM(total_conversations) AS total_conversations,
      SUM(new_leads) AS new_leads,
      SUM(deals_won) AS deals_won,
      SUM(deals_lost) AS deals_lost,
      AVG(conversion_rate) AS avg_conversion_rate
    FROM report_daily
    WHERE tenant_id = $1 AND date BETWEEN $2 AND $3 ${channelFilter}
  `, params);

  return res.rows[0];
}

async function getAIPerformanceReport(tenantId, { from, to } = {}, client) {
  const range = normalizeDateRange(from, to);
  const res = client
    ? await client.query(`
    SELECT
      SUM(ai_suggestions_sent) AS sent,
      SUM(ai_suggestions_used) AS used,
      SUM(ai_suggestions_edited) AS edited,
      SUM(ai_suggestions_sent) - SUM(ai_suggestions_used) - SUM(ai_suggestions_edited) AS ignored,
      AVG(conversion_rate) AS avg_conversion_rate
    FROM report_daily
    WHERE tenant_id = $1 AND date BETWEEN $2 AND $3
  `, [tenantId, range.from, range.to])
    : await queryAdmin(`
    SELECT
      SUM(ai_suggestions_sent) AS sent,
      SUM(ai_suggestions_used) AS used,
      SUM(ai_suggestions_edited) AS edited,
      SUM(ai_suggestions_sent) - SUM(ai_suggestions_used) - SUM(ai_suggestions_edited) AS ignored,
      AVG(conversion_rate) AS avg_conversion_rate
    FROM report_daily
    WHERE tenant_id = $1 AND date BETWEEN $2 AND $3
  `, [tenantId, range.from, range.to]);

  return res.rows[0];
}

async function getAgentReport(tenantId, { from, to, user_id } = {}, client) {
  const range = normalizeDateRange(from, to);
  const params = [tenantId, range.from, range.to];
  let agentFilter = '';
  if (user_id) { params.push(user_id); agentFilter = `AND r.user_id = $${params.length}`; }

  const res = client
    ? await client.query(`
    SELECT r.user_id, u.name AS agent_name,
      SUM(r.deals_closed) AS deals_closed,
      SUM(r.revenue_closed) AS revenue_closed,
      SUM(r.conversations_handled) AS conversations_handled,
      AVG(r.avg_response_time_seconds) AS avg_response_time,
      AVG(r.conversion_rate) AS conversion_rate
    FROM report_agent_daily r
    JOIN users u ON u.id = r.user_id
    WHERE r.tenant_id = $1 AND r.date BETWEEN $2 AND $3 ${agentFilter}
    GROUP BY r.user_id, u.name ORDER BY revenue_closed DESC
  `, params)
    : await queryAdmin(`
    SELECT r.user_id, u.name AS agent_name,
      SUM(r.deals_closed) AS deals_closed,
      SUM(r.revenue_closed) AS revenue_closed,
      SUM(r.conversations_handled) AS conversations_handled,
      AVG(r.avg_response_time_seconds) AS avg_response_time,
      AVG(r.conversion_rate) AS conversion_rate
    FROM report_agent_daily r
    JOIN users u ON u.id = r.user_id
    WHERE r.tenant_id = $1 AND r.date BETWEEN $2 AND $3 ${agentFilter}
    GROUP BY r.user_id, u.name ORDER BY revenue_closed DESC
  `, params);

  return res.rows;
}

async function getChannelReport(tenantId, { from, to } = {}, client) {
  const range = normalizeDateRange(from, to);
  const res = client
    ? await client.query(`
    SELECT channel,
      SUM(total_conversations) AS conversations,
      SUM(deals_won) AS deals_won,
      AVG(conversion_rate) AS conversion_rate,
      SUM(revenue_won) AS revenue
    FROM report_daily
    WHERE tenant_id = $1 AND date BETWEEN $2 AND $3 AND channel IS NOT NULL
    GROUP BY channel ORDER BY revenue DESC
  `, [tenantId, range.from, range.to])
    : await queryAdmin(`
    SELECT channel,
      SUM(total_conversations) AS conversations,
      SUM(deals_won) AS deals_won,
      AVG(conversion_rate) AS conversion_rate,
      SUM(revenue_won) AS revenue
    FROM report_daily
    WHERE tenant_id = $1 AND date BETWEEN $2 AND $3 AND channel IS NOT NULL
    GROUP BY channel ORDER BY revenue DESC
  `, [tenantId, range.from, range.to]);

  return res.rows;
}

async function getOverviewReport(tenantId, { from, to } = {}, client) {
  const range = normalizeDateRange(from, to);
  const executor = client ? client.query.bind(client) : queryAdmin;

  const result = await executor(`
    SELECT
      SUM(total_conversations)::int AS conversations,
      SUM(human_replies)::int AS messages,
      SUM(deals_won)::int AS deals_won,
      SUM(deals_won + deals_lost)::int AS total_deals,
      AVG(avg_response_time_seconds) AS avg_response_time_seconds,
      AVG(conversion_rate) AS conversion_rate
    FROM report_daily
    WHERE tenant_id = $1 AND date BETWEEN $2 AND $3
  `, [tenantId, range.from, range.to]);

  const row = result.rows[0] || {};
  const totalConversations = Number(row.conversations || 0);

  // If we have no pre-aggregated data for this range, we could fall back to raw scan
  // but the brief says "do not block request with heavy raw scan unless absolutely necessary".
  // For now, we return aggregated data.

  return {
    conversations: totalConversations,
    messages: Number(row.messages || 0),
    dealsWon: Number(row.deals_won || 0),
    totalDeals: Number(row.total_deals || 0),
    conversionRate: Number(row.conversion_rate || 0),
    avgResponseTimeSeconds: Number(Number(row.avg_response_time_seconds || 0).toFixed(2)),
  };
}

async function getDashboardSummary(tenantId, { from } = {}) {
  const fromDate = from || new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const toDate = new Date().toISOString().slice(0, 10);

  const [liveStats, revenueSeries, channelBreakdown, recentConversations, stageBreakdown] = await Promise.all([
    // Live counts direct from source tables — no limit cap
    queryAdmin(`
      SELECT
        (SELECT COUNT(*)::int FROM conversations WHERE tenant_id=$1 AND status='open') AS open_conversations,
        (SELECT COUNT(*)::int FROM deals WHERE tenant_id=$1 AND stage NOT IN ('won','lost')) AS active_deals,
        (SELECT COALESCE(SUM(estimated_value),0)::numeric FROM deals WHERE tenant_id=$1 AND stage NOT IN ('won','lost')) AS pipeline_value,
        (SELECT COUNT(*)::int FROM deals WHERE tenant_id=$1 AND stage='won') AS won_deals
    `, [tenantId]),

    // Revenue time series from pre-aggregated report_daily
    queryAdmin(`
      SELECT date,
        SUM(revenue_won) AS revenue,
        SUM(deals_won) AS deals_won
      FROM report_daily
      WHERE tenant_id=$1 AND date BETWEEN $2 AND $3
      GROUP BY date ORDER BY date
    `, [tenantId, fromDate, toDate]),

    // Channel breakdown from report_daily (7-day window, accurate at scale)
    queryAdmin(`
      SELECT channel, SUM(total_conversations)::int AS total
      FROM report_daily
      WHERE tenant_id=$1 AND date BETWEEN $2 AND $3 AND channel IS NOT NULL
      GROUP BY channel ORDER BY total DESC
    `, [tenantId, fromDate, toDate]),

    // Recent conversations — minimal fields, no limit issue
    queryAdmin(`
      SELECT c.id, c.channel, c.updated_at, c.status,
             c.last_message_preview AS last_message,
             cu.name AS customer_name
      FROM conversations c
      LEFT JOIN customers cu ON cu.id = c.customer_id
      WHERE c.tenant_id=$1
      ORDER BY c.updated_at DESC
      LIMIT 6
    `, [tenantId]),

    // Deal stage breakdown — for funnel chart
    queryAdmin(`
      SELECT stage, COUNT(*)::int AS total
      FROM deals
      WHERE tenant_id=$1
      GROUP BY stage
    `, [tenantId]),
  ]);

  const stats = liveStats.rows[0] || {};

  const stageMap = Object.fromEntries(stageBreakdown.rows.map((r) => [r.stage, Number(r.total)]));

  return {
    openConversations: Number(stats.open_conversations || 0),
    activeDeals: Number(stats.active_deals || 0),
    pipelineValue: Number(stats.pipeline_value || 0),
    wonDeals: Number(stats.won_deals || 0),
    revenueSeries: revenueSeries.rows.map((row) => ({
      date: row.date,
      revenue: Number(row.revenue || 0),
      deals_won: Number(row.deals_won || 0),
    })),
    stageBreakdown: stageMap,
    channelBreakdown: channelBreakdown.rows,
    recentConversations: recentConversations.rows,
  };
}

module.exports = {
  getRevenueReport,
  getConversionReport,
  getAIPerformanceReport,
  getAgentReport,
  getChannelReport,
  getOverviewReport,
  getDashboardSummary,
};
