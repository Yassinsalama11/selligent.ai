const { getRedisClient } = require('../db/redis');
const { queryAdmin } = require('../db/pool');

const QUEUE_KEY = 'airos:jobs';
const DEBOUNCE_SET_KEY = 'airos:jobs:active';
const IS_DEBUG = process.env.DEBUG_PERF === 'true';

/**
 * Enqueue a background job with debouncing.
 * Fails safely by running immediately (async) if Redis is unavailable.
 */
async function enqueueJob(type, payload) {
  const redis = getRedisClient();
  const { tenantId } = payload;
  const jobKey = `${type}:${tenantId}${payload.date ? ':' + payload.date : ''}`;
  const job = { type, payload, id: Math.random().toString(36).slice(2), created_at: Date.now(), key: jobKey };

  if (!redis) {
    if (IS_DEBUG) console.log(`[QUEUE] Redis unavailable, running job ${type} immediately`);
    processJob(job).catch(err => console.error(`[QUEUE] Immediate job failed: ${err.message}`));
    return;
  }

  try {
    // Debounce: check if this specific job type for this tenant is already active
    const isQueued = await redis.sadd(DEBOUNCE_SET_KEY, jobKey);
    if (isQueued === 0) {
      if (IS_DEBUG) console.log(`[QUEUE] Job ${jobKey} already queued, skipping`);
      return;
    }

    await redis.lpush(QUEUE_KEY, JSON.stringify(job));
    if (IS_DEBUG) console.log(`[QUEUE] Enqueued ${type} for tenant ${tenantId}`);
  } catch (err) {
    console.error(`[QUEUE] Enqueue failed: ${err.message}`);
    processJob(job).catch(() => {});
  }
}

async function processJob(job) {
  const { type, payload, key: jobKey } = job;
  const { tenantId } = payload;
  const redis = getRedisClient();

  try {
    if (type === 'refresh_tenant_stats') {
      await refreshTenantStats(tenantId);
    } else if (type === 'refresh_daily_report') {
      await refreshDailyReport(tenantId, payload.date);
    }
  } finally {
    // Always clear from debounce set even on failure so it can retry later
    if (redis && jobKey) {
      await redis.srem(DEBOUNCE_SET_KEY, jobKey);
    }
  }
}

async function refreshTenantStats(tenantId) {
  if (IS_DEBUG) console.log(`[STATS] Refreshing stats for tenant ${tenantId}`);
  
  await queryAdmin(`
    INSERT INTO tenant_stats (
      tenant_id,
      conversations_count,
      messages_count,
      customers_count,
      tickets_count,
      deals_count,
      users_count,
      channels_count,
      last_activity_at,
      updated_at
    )
    SELECT
      t.id,
      COALESCE(conv.count, 0),
      COALESCE(msg.count, 0),
      COALESCE(cust.count, 0),
      COALESCE(tick.count, 0),
      COALESCE(deal.count, 0),
      COALESCE(usr.count, 0),
      COALESCE(chan.count, 0),
      conv.last_seen,
      NOW()
    FROM tenants t
    LEFT JOIN LATERAL (SELECT COUNT(*)::int AS count, MAX(updated_at) AS last_seen FROM conversations WHERE tenant_id = t.id) AS conv ON TRUE
    LEFT JOIN LATERAL (SELECT COUNT(*)::int AS count FROM messages WHERE tenant_id = t.id) AS msg ON TRUE
    LEFT JOIN LATERAL (SELECT COUNT(*)::int AS count FROM customers WHERE tenant_id = t.id AND COALESCE(preferences->>'deleted_at', '') = '') AS cust ON TRUE
    LEFT JOIN LATERAL (SELECT COUNT(*)::int AS count FROM tickets WHERE tenant_id = t.id AND deleted_at IS NULL) AS tick ON TRUE
    LEFT JOIN LATERAL (SELECT COUNT(*)::int AS count FROM deals WHERE tenant_id = t.id) AS deal ON TRUE
    LEFT JOIN LATERAL (SELECT COUNT(*)::int AS count FROM users WHERE tenant_id = t.id) AS usr ON TRUE
    LEFT JOIN LATERAL (SELECT COUNT(*)::int AS count FROM channel_connections WHERE tenant_id = t.id AND status = 'active') AS chan ON TRUE
    WHERE t.id = $1
    ON CONFLICT (tenant_id) DO UPDATE
    SET
      conversations_count = EXCLUDED.conversations_count,
      messages_count = EXCLUDED.messages_count,
      customers_count = EXCLUDED.customers_count,
      tickets_count = EXCLUDED.tickets_count,
      deals_count = EXCLUDED.deals_count,
      users_count = EXCLUDED.users_count,
      channels_count = EXCLUDED.channels_count,
      last_activity_at = EXCLUDED.last_activity_at,
      updated_at = NOW()
  `, [tenantId]);
}

async function refreshDailyReport(tenantId, date) {
  const targetDate = date || new Date().toISOString().slice(0, 10);
  if (IS_DEBUG) console.log(`[REPORTS] Refreshing daily report for tenant ${tenantId} on ${targetDate}`);

  await queryAdmin(`
    INSERT INTO report_daily (
      tenant_id, date, channel, 
      total_conversations, new_leads, deals_won, deals_lost, revenue_won,
      human_replies, avg_response_time_seconds, conversion_rate
    )
    SELECT 
      $1, $2::date, c.channel,
      COUNT(DISTINCT c.id) AS total_conversations,
      COUNT(DISTINCT d.id) FILTER (WHERE d.created_at::date = $2::date) AS new_leads,
      COUNT(DISTINCT d.id) FILTER (WHERE d.stage = 'won' AND d.closed_at::date = $2::date) AS deals_won,
      COUNT(DISTINCT d.id) FILTER (WHERE d.stage = 'lost' AND d.closed_at::date = $2::date) AS deals_lost,
      COALESCE(SUM(d.estimated_value) FILTER (WHERE d.stage = 'won' AND d.closed_at::date = $2::date), 0) AS revenue_won,
      COUNT(DISTINCT m.id) FILTER (WHERE m.sent_by = 'agent') AS human_replies,
      AVG(EXTRACT(EPOCH FROM (first_outbound.created_at - first_inbound.created_at))) FILTER (WHERE first_outbound.created_at IS NOT NULL) AS avg_response_time,
      CASE WHEN COUNT(DISTINCT c.id) > 0 
           THEN (COUNT(DISTINCT d.id) FILTER (WHERE d.stage = 'won' AND d.closed_at::date = $2::date))::float / COUNT(DISTINCT c.id) * 100 
           ELSE 0 END AS conversion_rate
    FROM conversations c
    LEFT JOIN deals d ON d.conversation_id = c.id
    LEFT JOIN messages m ON m.conversation_id = c.id AND m.created_at::date = $2::date
    LEFT JOIN LATERAL (
      SELECT created_at FROM messages 
      WHERE conversation_id = c.id AND direction = 'inbound' 
      ORDER BY created_at ASC LIMIT 1
    ) AS first_inbound ON TRUE
    LEFT JOIN LATERAL (
      SELECT created_at FROM messages 
      WHERE conversation_id = c.id AND direction = 'outbound' AND created_at >= first_inbound.created_at
      ORDER BY created_at ASC LIMIT 1
    ) AS first_outbound ON TRUE
    WHERE c.tenant_id = $1 AND c.created_at::date = $2::date
    GROUP BY c.channel
    ON CONFLICT (tenant_id, date, channel) DO UPDATE SET
      total_conversations = EXCLUDED.total_conversations,
      new_leads = EXCLUDED.new_leads,
      deals_won = EXCLUDED.deals_won,
      deals_lost = EXCLUDED.deals_lost,
      revenue_won = EXCLUDED.revenue_won,
      human_replies = EXCLUDED.human_replies,
      avg_response_time_seconds = EXCLUDED.avg_response_time_seconds,
      conversion_rate = EXCLUDED.conversion_rate
  `, [tenantId, targetDate]);
}

/**
 * Simple worker loop.
 */
async function startWorker() {
  const redis = getRedisClient();
  if (!redis) return;

  if (IS_DEBUG) console.log('[QUEUE] Background worker started');

  while (true) {
    try {
      const result = await redis.brpop(QUEUE_KEY, 5);
      if (result) {
        const job = JSON.parse(result[1]);
        if (IS_DEBUG) console.log(`[QUEUE] Processing ${job.type}...`);
        await processJob(job);
      }
    } catch (err) {
      console.error(`[QUEUE] Worker error: ${err.message}`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

module.exports = {
  enqueueJob,
  startWorker,
  refreshTenantStats,
  refreshDailyReport
};
