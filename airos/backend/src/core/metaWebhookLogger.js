const { queryAdmin } = require('../db/pool');

/**
 * Write a sanitised audit record to meta_webhook_events.
 * Never throws — must not disrupt inbound message processing.
 */
async function logMetaWebhookEvent({
  tenantId,
  channel,          // 'messenger' | 'instagram' | 'whatsapp'
  assetType,        // 'page' | 'ig_account' | 'whatsapp_number'
  assetId,          // page_id | ig_account_id | phone_number_id
  assetName,        // display label
  eventType,        // 'message' | 'message_status' | 'postback' | 'mention'
  providerEventId,  // platform message ID
  summary,          // short human-readable, NO full message content
  rawPayloadRedacted = null,
  processedStatus = 'received',
}) {
  try {
    await queryAdmin(
      `INSERT INTO meta_webhook_events
         (tenant_id, channel, asset_type, asset_id, asset_name,
          event_type, provider_event_id, summary,
          raw_payload_redacted, processed_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        tenantId || null,
        channel,
        assetType,
        assetId || null,
        assetName || null,
        eventType,
        providerEventId || null,
        summary || null,
        rawPayloadRedacted ? JSON.stringify(rawPayloadRedacted) : null,
        processedStatus,
      ]
    );
  } catch {
    // Intentionally silent — logging must never block message processing
  }
}

async function markMetaWebhookEventProcessed(providerEventId) {
  if (!providerEventId) return;
  try {
    await queryAdmin(
      `UPDATE meta_webhook_events
          SET processed_status = 'processed', processed_at = NOW()
        WHERE provider_event_id = $1`,
      [providerEventId]
    );
  } catch {}
}

module.exports = { logMetaWebhookEvent, markMetaWebhookEventProcessed };
