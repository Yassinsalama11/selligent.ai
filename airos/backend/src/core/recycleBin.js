const crypto = require('crypto');

const { getTenantById, updateTenantSettings } = require('../db/queries/tenants');
const { normalizeTenantSettings, isPlainObject } = require('./tenantSettings');

const MAX_RECYCLE_ITEMS = 250;

function buildRecycleItem(input = {}) {
  const deletedAt = input.deletedAt || input.deleted_at || new Date().toISOString();
  return {
    id: String(input.id || `rb_${crypto.randomUUID()}`),
    type: String(input.type || input.entityType || 'record'),
    entityType: String(input.entityType || input.type || 'record'),
    entityId: input.entityId ? String(input.entityId) : '',
    name: String(input.name || 'Untitled record'),
    info: String(input.info || ''),
    deletedAt,
    metadata: isPlainObject(input.metadata) ? input.metadata : {},
  };
}

async function getRecycleBin(tenantId) {
  const tenant = await getTenantById(tenantId);
  return normalizeTenantSettings(tenant?.settings).recycled;
}

async function appendRecycleItem(tenantId, item) {
  const tenant = await getTenantById(tenantId);
  const settings = normalizeTenantSettings(tenant?.settings);
  const nextItem = buildRecycleItem(item);

  settings.recycled = [
    nextItem,
    ...settings.recycled.filter((entry) => entry.id !== nextItem.id),
  ].slice(0, MAX_RECYCLE_ITEMS);

  const saved = await updateTenantSettings(tenantId, settings);
  return {
    item: nextItem,
    recycled: normalizeTenantSettings(saved?.settings).recycled,
  };
}

async function removeRecycleItem(tenantId, itemId) {
  const tenant = await getTenantById(tenantId);
  const settings = normalizeTenantSettings(tenant?.settings);
  const existing = settings.recycled.find((entry) => entry.id === itemId) || null;

  settings.recycled = settings.recycled.filter((entry) => entry.id !== itemId);
  const saved = await updateTenantSettings(tenantId, settings);

  return {
    item: existing,
    recycled: normalizeTenantSettings(saved?.settings).recycled,
  };
}

async function clearRecycleBin(tenantId) {
  const tenant = await getTenantById(tenantId);
  const settings = normalizeTenantSettings(tenant?.settings);
  settings.recycled = [];
  const saved = await updateTenantSettings(tenantId, settings);
  return normalizeTenantSettings(saved?.settings).recycled;
}

module.exports = {
  appendRecycleItem,
  buildRecycleItem,
  clearRecycleBin,
  getRecycleBin,
  removeRecycleItem,
};
