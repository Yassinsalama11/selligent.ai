const VALID_STATUSES = new Set(['draft', 'scheduled', 'sending', 'sent', 'paused', 'canceled', 'failed']);
const VALID_CHANNELS = new Set(['whatsapp', 'instagram', 'messenger', 'livechat']);

function asArray(value) {
  if (Array.isArray(value)) return value.map(String).map((entry) => entry.trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function normalizeChannel(value) {
  const channel = String(value || 'whatsapp').trim().toLowerCase();
  return VALID_CHANNELS.has(channel) ? channel : 'whatsapp';
}

function normalizeStatus(value, fallback = 'draft') {
  const status = String(value || '').trim().toLowerCase();
  return VALID_STATUSES.has(status) ? status : fallback;
}

function normalizeAudienceFilter(value = {}) {
  const input = value && typeof value === 'object' ? value : {};
  const filters = {
    tags: asArray(input.tags),
    channels: asArray(input.channels || input.channel).map((entry) => entry.toLowerCase()),
    conversation_status: String(input.conversation_status || input.conversationStatus || '').trim().toLowerCase(),
    assigned_to: String(input.assigned_to || input.assignedTo || '').trim(),
    segment: String(input.segment || '').trim(),
  };

  Object.keys(filters).forEach((key) => {
    if (Array.isArray(filters[key]) && filters[key].length === 0) delete filters[key];
    else if (!Array.isArray(filters[key]) && !filters[key]) delete filters[key];
  });

  return filters;
}

function normalizeVariables(value = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeCampaignInput(input = {}, existing = {}) {
  const scheduledAt = input.scheduled_at ?? input.scheduledAt ?? existing.scheduled_at ?? null;
  const nextStatus = input.status
    ? normalizeStatus(input.status, existing.status || 'draft')
    : (scheduledAt && new Date(scheduledAt).getTime() > Date.now() ? 'scheduled' : (existing.status || 'draft'));

  return {
    name: String(input.name ?? existing.name ?? '').trim(),
    description: String(input.description ?? existing.description ?? '').trim(),
    channel: normalizeChannel(input.channel ?? existing.channel),
    message_type: String(input.message_type ?? input.messageType ?? existing.message_type ?? 'template').trim().toLowerCase() || 'template',
    template_name: input.template_name ?? input.templateName ?? existing.template_name ?? null,
    template_language: String(input.template_language ?? input.templateLanguage ?? existing.template_language ?? 'ar').trim() || 'ar',
    body: String(input.body ?? existing.body ?? '').trim(),
    variables: normalizeVariables(input.variables ?? existing.variables),
    audience_filter: normalizeAudienceFilter(input.audience_filter ?? input.audienceFilter ?? existing.audience_filter),
    scheduled_at: scheduledAt || null,
    status: nextStatus,
  };
}

function mapCampaignRow(row = {}) {
  const stats = row.stats && typeof row.stats === 'object' ? row.stats : {};
  return {
    ...row,
    variables: row.variables || {},
    audience_filter: row.audience_filter || {},
    stats: {
      pending: Number(stats.pending || 0),
      sent: Number(stats.sent || 0),
      delivered: Number(stats.delivered || 0),
      read: Number(stats.read || 0),
      failed: Number(stats.failed || 0),
      skipped: Number(stats.skipped || 0),
      total: Number(stats.total || 0),
    },
  };
}

function buildCampaignSelect(whereSql) {
  return `
    SELECT
      c.*,
      COALESCE(stats.counts, '{}'::jsonb) AS stats
    FROM campaigns c
    LEFT JOIN LATERAL (
      SELECT jsonb_object_agg(status, count)::jsonb || jsonb_build_object('total', SUM(count)) AS counts
      FROM (
        SELECT status, COUNT(*)::int AS count
        FROM campaign_recipients cr
        WHERE cr.tenant_id = c.tenant_id AND cr.campaign_id = c.id
        GROUP BY status
      ) grouped
    ) stats ON TRUE
    ${whereSql}
  `;
}

async function listCampaigns(tenantId, { status, limit = 50, offset = 0 } = {}, client) {
  const params = [tenantId];
  const clauses = ['c.tenant_id = $1'];

  if (status && status !== 'all') {
    params.push(normalizeStatus(status, 'draft'));
    clauses.push(`c.status = $${params.length}`);
  }

  params.push(Math.min(Math.max(Number(limit) || 50, 1), 100));
  params.push(Math.max(Number(offset) || 0, 0));

  const result = await client.query(`
    ${buildCampaignSelect(`WHERE ${clauses.join(' AND ')}`)}
    ORDER BY c.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  return result.rows.map(mapCampaignRow);
}

async function getCampaignById(tenantId, campaignId, client) {
  const result = await client.query(`
    ${buildCampaignSelect('WHERE c.tenant_id = $1 AND c.id = $2')}
    LIMIT 1
  `, [tenantId, campaignId]);
  return result.rows[0] ? mapCampaignRow(result.rows[0]) : null;
}

async function createCampaign(tenantId, input, createdBy, client) {
  const campaign = normalizeCampaignInput(input);
  if (!campaign.name) throw new Error('Campaign name is required');
  if (!campaign.body && !campaign.template_name) throw new Error('Campaign body or template is required');

  const result = await client.query(`
    INSERT INTO campaigns (
      tenant_id, name, description, channel, message_type, template_name,
      template_language, body, variables, audience_filter, scheduled_at, status, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `, [
    tenantId,
    campaign.name,
    campaign.description,
    campaign.channel,
    campaign.message_type,
    campaign.template_name,
    campaign.template_language,
    campaign.body,
    JSON.stringify(campaign.variables),
    JSON.stringify(campaign.audience_filter),
    campaign.scheduled_at,
    campaign.status,
    createdBy,
  ]);

  return getCampaignById(tenantId, result.rows[0].id, client);
}

async function updateCampaign(tenantId, campaignId, input, client) {
  const existing = await getCampaignById(tenantId, campaignId, client);
  if (!existing) return null;
  if (['sending', 'sent', 'canceled'].includes(existing.status)) {
    throw new Error('Campaign cannot be edited in its current status');
  }

  const campaign = normalizeCampaignInput(input, existing);
  if (!campaign.name) throw new Error('Campaign name is required');
  if (!campaign.body && !campaign.template_name) throw new Error('Campaign body or template is required');

  const result = await client.query(`
    UPDATE campaigns
    SET name = $1,
        description = $2,
        channel = $3,
        message_type = $4,
        template_name = $5,
        template_language = $6,
        body = $7,
        variables = $8,
        audience_filter = $9,
        scheduled_at = $10,
        status = $11,
        updated_at = NOW()
    WHERE tenant_id = $12 AND id = $13
    RETURNING *
  `, [
    campaign.name,
    campaign.description,
    campaign.channel,
    campaign.message_type,
    campaign.template_name,
    campaign.template_language,
    campaign.body,
    JSON.stringify(campaign.variables),
    JSON.stringify(campaign.audience_filter),
    campaign.scheduled_at,
    campaign.status,
    tenantId,
    campaignId,
  ]);

  return result.rows[0] ? getCampaignById(tenantId, campaignId, client) : null;
}

async function deleteCampaign(tenantId, campaignId, client) {
  const result = await client.query(
    'DELETE FROM campaigns WHERE tenant_id = $1 AND id = $2 AND status <> $3 RETURNING id',
    [tenantId, campaignId, 'sending']
  );
  return Boolean(result.rows[0]);
}

function buildAudienceClauses(tenantId, channel, filters = {}) {
  const params = [tenantId];
  const clauses = [
    'cu.tenant_id = $1',
    "COALESCE(cu.preferences->>'deleted_at', '') = ''",
  ];

  if (channel === 'whatsapp') clauses.push("COALESCE(cu.phone, '') <> ''");

  if (filters.channels?.length) {
    params.push(filters.channels);
    clauses.push(`cu.channel = ANY($${params.length}::text[])`);
  }

  if (filters.tags?.length) {
    params.push(filters.tags);
    clauses.push(`EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(COALESCE(cu.tags, '[]'::jsonb)) AS tag(value)
      WHERE tag.value = ANY($${params.length}::text[])
    )`);
  }

  if (filters.conversation_status) {
    params.push(filters.conversation_status);
    clauses.push(`EXISTS (
      SELECT 1 FROM conversations conv
      WHERE conv.tenant_id = cu.tenant_id
        AND conv.customer_id = cu.id
        AND conv.status = $${params.length}
    )`);
  }

  if (filters.assigned_to) {
    if (filters.assigned_to === 'unassigned') {
      clauses.push(`EXISTS (
        SELECT 1 FROM conversations conv
        WHERE conv.tenant_id = cu.tenant_id
          AND conv.customer_id = cu.id
          AND conv.assigned_to IS NULL
      )`);
    } else {
      params.push(filters.assigned_to);
      clauses.push(`EXISTS (
        SELECT 1 FROM conversations conv
        WHERE conv.tenant_id = cu.tenant_id
          AND conv.customer_id = cu.id
          AND conv.assigned_to = $${params.length}
      )`);
    }
  }

  if (filters.segment) {
    params.push(filters.segment);
    clauses.push(`cu.preferences->>'segment' = $${params.length}`);
  }

  return { params, clauses };
}

async function resolveAudience(tenantId, channel, audienceFilter = {}, client, limit = 5000) {
  const filters = normalizeAudienceFilter(audienceFilter);
  const { params, clauses } = buildAudienceClauses(tenantId, channel, filters);
  params.push(channel);
  const channelIndex = params.length;
  params.push(Math.min(Math.max(Number(limit) || 5000, 1), 5000));
  const limitIndex = params.length;

  const result = await client.query(`
    SELECT DISTINCT
      cu.id,
      cu.name,
      cu.phone,
      cu.channel,
      cu.channel_customer_id,
      cu.tags,
      cu.preferences,
      CASE
        WHEN $${channelIndex} = 'whatsapp' THEN cu.phone
        ELSE cu.channel_customer_id
      END AS address
    FROM customers cu
    WHERE ${clauses.join(' AND ')}
    ORDER BY cu.created_at DESC
    LIMIT $${limitIndex}
  `, params);

  return result.rows;
}

async function previewAudience(tenantId, channel, audienceFilter, client) {
  const audience = await resolveAudience(tenantId, channel, audienceFilter, client);
  return {
    count: audience.length,
    sample: audience.slice(0, 20),
  };
}

async function materializeRecipients(tenantId, campaign, client) {
  const audience = await resolveAudience(tenantId, campaign.channel, campaign.audience_filter, client);

  for (const customer of audience) {
    await client.query(`
      INSERT INTO campaign_recipients (tenant_id, campaign_id, customer_id, channel, address, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      ON CONFLICT (campaign_id, customer_id) DO UPDATE
      SET address = EXCLUDED.address,
          channel = EXCLUDED.channel,
          updated_at = NOW()
      WHERE campaign_recipients.status IN ('pending', 'failed', 'skipped')
    `, [tenantId, campaign.id, customer.id, campaign.channel, customer.address || '']);
  }

  return audience.length;
}

async function listPendingRecipients(tenantId, campaignId, batchSize, client) {
  const result = await client.query(`
    SELECT cr.*, cu.name AS customer_name, cu.phone, cu.channel_customer_id, cu.preferences
    FROM campaign_recipients cr
    JOIN customers cu
      ON cu.tenant_id = cr.tenant_id
     AND cu.id = cr.customer_id
    WHERE cr.tenant_id = $1
      AND cr.campaign_id = $2
      AND cr.status IN ('pending', 'failed')
    ORDER BY cr.created_at ASC
    LIMIT $3
  `, [tenantId, campaignId, Math.min(Math.max(Number(batchSize) || 25, 1), 100)]);

  return result.rows;
}

async function updateRecipientDelivery(tenantId, recipientId, patch, client) {
  const result = await client.query(`
    UPDATE campaign_recipients
    SET status = $1,
        conversation_id = COALESCE($2, conversation_id),
        provider_message_id = $3,
        error = $4,
        sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE sent_at END,
        updated_at = NOW()
    WHERE tenant_id = $5 AND id = $6
    RETURNING *
  `, [
    patch.status,
    patch.conversation_id || null,
    patch.provider_message_id || null,
    patch.error || null,
    tenantId,
    recipientId,
  ]);

  return result.rows[0] || null;
}

async function setCampaignStatus(tenantId, campaignId, status, client) {
  const nextStatus = normalizeStatus(status, 'draft');
  const result = await client.query(`
    UPDATE campaigns
    SET status = $1,
        sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE sent_at END,
        updated_at = NOW()
    WHERE tenant_id = $2 AND id = $3
    RETURNING *
  `, [nextStatus, tenantId, campaignId]);
  return result.rows[0] ? getCampaignById(tenantId, campaignId, client) : null;
}

module.exports = {
  createCampaign,
  deleteCampaign,
  getCampaignById,
  listCampaigns,
  listPendingRecipients,
  materializeRecipients,
  previewAudience,
  resolveAudience,
  setCampaignStatus,
  updateCampaign,
  updateRecipientDelivery,
};
