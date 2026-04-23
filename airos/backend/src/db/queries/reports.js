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

  const [conversationResult, messageResult, conversionResult, responseResult] = await Promise.all([
    executor(`
      SELECT COUNT(*)::int AS conversations
      FROM conversations
      WHERE tenant_id = $1
        AND created_at >= $2::date
        AND created_at < ($3::date + INTERVAL '1 day')
    `, [tenantId, range.from, range.to]),
    executor(`
      SELECT COUNT(*)::int AS messages
      FROM messages
      WHERE tenant_id = $1
        AND created_at >= $2::date
        AND created_at < ($3::date + INTERVAL '1 day')
    `, [tenantId, range.from, range.to]),
    executor(`
      SELECT
        COUNT(*)::int AS total_deals,
        COUNT(*) FILTER (WHERE stage = 'won')::int AS deals_won
      FROM deals
      WHERE tenant_id = $1
        AND created_at >= $2::date
        AND created_at < ($3::date + INTERVAL '1 day')
    `, [tenantId, range.from, range.to]),
    executor(`
      SELECT AVG(EXTRACT(EPOCH FROM (first_outbound.created_at - first_inbound.created_at))) AS avg_response_time_seconds
      FROM conversations c
      JOIN LATERAL (
        SELECT m.created_at
        FROM messages m
        WHERE m.conversation_id = c.id
          AND m.direction = 'inbound'
        ORDER BY m.created_at ASC
        LIMIT 1
      ) AS first_inbound ON TRUE
      JOIN LATERAL (
        SELECT m.created_at
        FROM messages m
        WHERE m.conversation_id = c.id
          AND m.direction = 'outbound'
          AND m.created_at >= first_inbound.created_at
        ORDER BY m.created_at ASC
        LIMIT 1
      ) AS first_outbound ON TRUE
      WHERE c.tenant_id = $1
        AND c.created_at >= $2::date
        AND c.created_at < ($3::date + INTERVAL '1 day')
    `, [tenantId, range.from, range.to]),
  ]);

  const totalConversations = Number(conversationResult.rows[0]?.conversations || 0);
  const totalMessages = Number(messageResult.rows[0]?.messages || 0);
  const totalDeals = Number(conversionResult.rows[0]?.total_deals || 0);
  const dealsWon = Number(conversionResult.rows[0]?.deals_won || 0);
  const avgResponseTimeSeconds = Number(responseResult.rows[0]?.avg_response_time_seconds || 0);

  return {
    conversations: totalConversations,
    messages: totalMessages,
    dealsWon,
    totalDeals,
    conversionRate: totalConversations > 0
      ? Number(((dealsWon / totalConversations) * 100).toFixed(2))
      : 0,
    avgResponseTimeSeconds: Number(avgResponseTimeSeconds.toFixed(2)),
  };
}

module.exports = {
  getRevenueReport,
  getConversionReport,
  getAIPerformanceReport,
  getAgentReport,
  getChannelReport,
  getOverviewReport,
};
