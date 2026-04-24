const { queryAdmin } = require('./pool');
const { enqueueJob } = require('../core/queue');

async function validateTenantStatsBackfill() {
  try {
    console.log('[Validation] Starting tenant_stats backfill validation...');
    
    const res = await queryAdmin(`
      SELECT 
        t.id as tenant_id,
        t.name,
        COALESCE(s.conversations_count, 0) as stats_conv,
        (SELECT COUNT(*)::int FROM conversations WHERE tenant_id = t.id) as real_conv,
        COALESCE(s.messages_count, 0) as stats_msg,
        (SELECT COUNT(*)::int FROM messages WHERE tenant_id = t.id) as real_msg
      FROM tenants t
      LEFT JOIN tenant_stats s ON s.tenant_id = t.id
    `);

    let triggers = 0;
    for (const row of res.rows) {
      const { tenant_id, name, stats_conv, real_conv, stats_msg, real_msg } = row;
      
      // If stats are significantly out of sync or zero while data exists
      if ((real_conv > 0 && stats_conv === 0) || Math.abs(stats_msg - real_msg) > 10) {
        console.log(`[Validation] Triggering refresh for tenant ${name} (${tenant_id})`);
        await enqueueJob('refresh_tenant_stats', { tenantId: tenant_id });
        triggers += 1;
      }
    }

    console.log(`[Validation] Completed. Triggered ${triggers} refreshes.`);
  } catch (err) {
    console.error('[Validation] Backfill check failed:', err.message);
  }
}

module.exports = {
  validateTenantStatsBackfill,
};
