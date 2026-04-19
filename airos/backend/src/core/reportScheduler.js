const { queryAdmin } = require('../db/pool');
const { getTenantById, updateTenantSettings } = require('../db/queries/tenants');
const { normalizeTenantSettings } = require('./tenantSettings');
const { sendEmail } = require('./emailService');

let schedulerTimer = null;

function getTimeZoneForTenant(tenant, settings) {
  return settings.company?.timezone
    || settings.profile?.timezone
    || 'UTC';
}

function getZonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function getIsoWeekKey(parts) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const target = new Date(date.valueOf());
  const dayNr = (date.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);
  const week = 1 + Math.round((target - firstThursday) / 604800000);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getSchedulePeriodKey(schedule, now = new Date(), timeZone = 'UTC') {
  const parts = getZonedParts(now, timeZone);
  const freq = String(schedule?.freq || 'daily').toLowerCase();

  if (freq === 'weekly') return getIsoWeekKey(parts);
  if (freq === 'monthly') return `${parts.year}-${String(parts.month).padStart(2, '0')}`;
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function hasReachedScheduledTime(schedule, now = new Date(), timeZone = 'UTC') {
  const parts = getZonedParts(now, timeZone);
  const [hoursRaw, minutesRaw] = String(schedule?.time || '08:00').split(':');
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return true;
  if (parts.hour > hours) return true;
  if (parts.hour === hours && parts.minute >= minutes) return true;
  return false;
}

function getWindowDays(freq) {
  if (freq === 'weekly') return 7;
  if (freq === 'monthly') return 30;
  return 1;
}

async function buildReportSummary(tenantId, freq = 'daily') {
  const days = getWindowDays(String(freq || 'daily').toLowerCase());
  const from = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

  const [conversationStats, dealStats, aiStats, channelStats, agentStats] = await Promise.all([
    queryAdmin(`
      SELECT
        COUNT(*)::int AS total_conversations,
        COUNT(*) FILTER (WHERE status = 'open')::int AS open_conversations
      FROM conversations
      WHERE tenant_id = $1 AND created_at >= $2
    `, [tenantId, from]),
    queryAdmin(`
      SELECT
        COUNT(*) FILTER (WHERE stage = 'won')::int AS deals_won,
        COUNT(*) FILTER (WHERE stage = 'lost')::int AS deals_lost,
        COALESCE(SUM(CASE WHEN stage = 'won' THEN COALESCE(estimated_value, 0) ELSE 0 END), 0)::numeric AS revenue_won
      FROM deals
      WHERE tenant_id = $1 AND COALESCE(closed_at, updated_at, created_at) >= $2
    `, [tenantId, from]),
    queryAdmin(`
      SELECT
        COUNT(*)::int AS sent,
        COUNT(*) FILTER (WHERE was_used = TRUE)::int AS used,
        COUNT(*) FILTER (WHERE was_edited = TRUE)::int AS edited
      FROM ai_suggestions
      WHERE tenant_id = $1 AND created_at >= $2
    `, [tenantId, from]),
    queryAdmin(`
      SELECT channel, COUNT(*)::int AS conversations
      FROM conversations
      WHERE tenant_id = $1 AND created_at >= $2
      GROUP BY channel
      ORDER BY conversations DESC
      LIMIT 5
    `, [tenantId, from]),
    queryAdmin(`
      SELECT
        u.name AS agent_name,
        COALESCE(SUM(r.conversations_handled), 0)::int AS conversations_handled,
        COALESCE(SUM(r.deals_closed), 0)::int AS deals_closed,
        COALESCE(SUM(r.revenue_closed), 0)::numeric AS revenue_closed
      FROM report_agent_daily r
      JOIN users u ON u.id = r.user_id
      WHERE r.tenant_id = $1 AND r.date >= $2::date
      GROUP BY u.name
      ORDER BY revenue_closed DESC, conversations_handled DESC
      LIMIT 5
    `, [tenantId, from]),
  ]);

  return {
    windowDays: days,
    totals: {
      totalConversations: Number(conversationStats.rows[0]?.total_conversations || 0),
      openConversations: Number(conversationStats.rows[0]?.open_conversations || 0),
      dealsWon: Number(dealStats.rows[0]?.deals_won || 0),
      dealsLost: Number(dealStats.rows[0]?.deals_lost || 0),
      revenueWon: Number(dealStats.rows[0]?.revenue_won || 0),
      aiSent: Number(aiStats.rows[0]?.sent || 0),
      aiUsed: Number(aiStats.rows[0]?.used || 0),
      aiEdited: Number(aiStats.rows[0]?.edited || 0),
    },
    channels: channelStats.rows.map((row) => ({
      channel: row.channel,
      conversations: Number(row.conversations || 0),
    })),
    agents: agentStats.rows.map((row) => ({
      agent: row.agent_name,
      conversationsHandled: Number(row.conversations_handled || 0),
      dealsClosed: Number(row.deals_closed || 0),
      revenueClosed: Number(row.revenue_closed || 0),
    })),
  };
}

function renderReportHtml(tenant, schedule, summary) {
  const metric = (label, value) => `
    <div style="padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc">
      <div style="font-size:12px;color:#64748b;margin-bottom:6px">${label}</div>
      <div style="font-size:24px;font-weight:700;color:#0f172a">${value}</div>
    </div>
  `;

  const channelRows = summary.channels.length > 0
    ? summary.channels.map((channel) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-transform:capitalize">${channel.channel}</td>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right">${channel.conversations}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="2" style="padding:8px 0;color:#64748b">No channel activity in this period.</td></tr>';

  const agentRows = summary.agents.length > 0
    ? summary.agents.map((agent) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb">${agent.agent}</td>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right">${agent.conversationsHandled}</td>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right">${agent.dealsClosed}</td>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right">${agent.revenueClosed.toFixed(2)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="4" style="padding:8px 0;color:#64748b">No agent report data in this period.</td></tr>';

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
      <h1 style="margin:0 0 8px">ChatOrAI ${schedule.name || 'Scheduled Report'}</h1>
      <p style="margin:0 0 24px;color:#475569">
        ${tenant.name} · last ${summary.windowDays} day(s)
      </p>

      <div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:12px;margin-bottom:24px">
        ${metric('Conversations', summary.totals.totalConversations)}
        ${metric('Open Conversations', summary.totals.openConversations)}
        ${metric('Revenue Won', summary.totals.revenueWon.toFixed(2))}
        ${metric('Deals Won', summary.totals.dealsWon)}
        ${metric('Deals Lost', summary.totals.dealsLost)}
        ${metric('AI Suggestions Used', summary.totals.aiUsed)}
      </div>

      <h2 style="margin:0 0 12px">Channel Breakdown</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead>
          <tr>
            <th style="text-align:left;padding:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase">Channel</th>
            <th style="text-align:right;padding:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase">Conversations</th>
          </tr>
        </thead>
        <tbody>${channelRows}</tbody>
      </table>

      <h2 style="margin:0 0 12px">Agent Performance</h2>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            <th style="text-align:left;padding:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase">Agent</th>
            <th style="text-align:right;padding:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase">Conversations</th>
            <th style="text-align:right;padding:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase">Deals</th>
            <th style="text-align:right;padding:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase">Revenue</th>
          </tr>
        </thead>
        <tbody>${agentRows}</tbody>
      </table>
    </div>
  `;
}

async function runScheduleForTenant(tenant, scheduleId, { force = false } = {}) {
  const settings = normalizeTenantSettings(tenant?.settings);
  const timeZone = getTimeZoneForTenant(tenant, settings);
  const schedules = settings.schedReports.map((schedule) => ({ ...schedule }));
  const results = [];

  for (const schedule of schedules) {
    if (schedule.active === false) continue;
    if (scheduleId && schedule.id !== scheduleId) continue;

    const periodKey = getSchedulePeriodKey(schedule, new Date(), timeZone);
    const due = force || (
      hasReachedScheduledTime(schedule, new Date(), timeZone)
      && schedule.lastRunKey !== periodKey
    );

    if (!due) continue;

    try {
      const summary = await buildReportSummary(tenant.id, schedule.freq);
      const html = renderReportHtml(tenant, schedule, summary);
      const subject = `${tenant.name} · ${schedule.name || 'Scheduled report'} · ${periodKey}`;
      await sendEmail({
        to: schedule.email || tenant.email,
        subject,
        html,
        text: `${tenant.name} report for ${periodKey}`,
      });

      schedule.lastRunAt = new Date().toISOString();
      schedule.lastRunKey = periodKey;
      schedule.lastStatus = 'sent';
      schedule.lastError = '';

      results.push({
        id: schedule.id,
        status: 'sent',
        email: schedule.email || tenant.email,
        periodKey,
      });
    } catch (err) {
      schedule.lastRunAt = new Date().toISOString();
      schedule.lastRunKey = force ? schedule.lastRunKey : periodKey;
      schedule.lastStatus = 'failed';
      schedule.lastError = err.message;

      results.push({
        id: schedule.id,
        status: 'failed',
        error: err.message,
        email: schedule.email || tenant.email,
      });
    }
  }

  if (results.length > 0) {
    settings.schedReports = schedules;
    await updateTenantSettings(tenant.id, settings);
  }

  return results;
}

async function runScheduledReportsForTenant(tenantId, scheduleId, options = {}) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) return [];
  return runScheduleForTenant(tenant, scheduleId, options);
}

async function processAllTenants() {
  const tenants = await queryAdmin(`
    SELECT id, name, email, settings
    FROM tenants
    WHERE status = 'active'
  `).then((result) => result.rows);

  for (const tenant of tenants) {
    try {
      await runScheduleForTenant(tenant);
    } catch (err) {
      console.error('[ReportScheduler]', tenant.id, err.message);
    }
  }
}

function startReportScheduler({ intervalMs = 60000 } = {}) {
  if (schedulerTimer) return schedulerTimer;

  schedulerTimer = setInterval(() => {
    processAllTenants().catch((err) => {
      console.error('[ReportScheduler] tick failed', err.message);
    });
  }, intervalMs);

  processAllTenants().catch((err) => {
    console.error('[ReportScheduler] initial run failed', err.message);
  });

  return schedulerTimer;
}

module.exports = {
  buildReportSummary,
  runScheduledReportsForTenant,
  startReportScheduler,
};
