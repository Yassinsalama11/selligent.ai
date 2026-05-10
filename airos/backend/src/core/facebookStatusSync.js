const { queryAdmin } = require('../db/pool');
const { decryptCredentials } = require('./tenantManager');
const { sendTokenExpiredAlert } = require('../services/email/emailService');

const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

async function verifyPageToken(accessToken) {
  try {
    const res = await fetch(`${GRAPH_BASE}/me?fields=id&access_token=${accessToken}`);
    const data = await res.json();
    if (data.error) {
      const code = data.error.code;
      // 190 = invalid/expired token, 102 = session expired
      if (code === 190 || code === 102) return 'expired';
      return 'error';
    }
    return 'ok';
  } catch {
    return 'unknown';
  }
}

async function syncFacebookChannelStatuses() {
  const result = await queryAdmin(`
    SELECT id, tenant_id, channel, credentials, status
    FROM channel_connections
    WHERE channel IN ('messenger', 'instagram')
    AND status = 'active'
  `);

  for (const row of result.rows) {
    try {
      const creds = decryptCredentials(row.credentials);
      const token = creds.access_token;
      if (!token) continue;

      const tokenStatus = await verifyPageToken(token);

      if (tokenStatus === 'expired') {
        await queryAdmin(
          `UPDATE channel_connections SET status = 'error', updated_at = NOW() WHERE id = $1`,
          [row.id],
        );
        console.log(`[FacebookStatusSync] Token expired for tenant ${row.tenant_id} channel ${row.channel}`);
        sendTokenExpiredAlert({ tenantId: row.tenant_id, channelName: row.channel }).catch(() => {});
      }
    } catch (err) {
      console.warn(`[FacebookStatusSync] Failed to check ${row.id}:`, err.message);
    }
  }
}

// Run on startup with a delay, then every 4 hours
let _syncTimer = null;

function startFacebookStatusSync() {
  if (_syncTimer) return;
  // First check after 2 minutes (let server finish booting)
  setTimeout(async () => {
    await syncFacebookChannelStatuses().catch(err => console.warn('[FacebookStatusSync]', err.message));
    _syncTimer = setInterval(
      () => syncFacebookChannelStatuses().catch(err => console.warn('[FacebookStatusSync]', err.message)),
      4 * 60 * 60 * 1000,
    );
  }, 2 * 60 * 1000);
}

module.exports = { startFacebookStatusSync, syncFacebookChannelStatuses };
