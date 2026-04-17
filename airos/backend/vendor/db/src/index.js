const { getPrisma, getPrismaForTenant, withTenant, invalidateTenantCache, disconnect } = require('./client');
const conversations = require('./repos/conversations');
const messages = require('./repos/messages');
const customers = require('./repos/customers');
const deals = require('./repos/deals');
const tenants = require('./repos/tenants');
const auditLog = require('./repos/auditLog');
const encryption = require('./encryption');
const { detectPii } = require('./piiDetect');
const retention = require('./retentionScheduler');

module.exports = {
  getPrisma,
  getPrismaForTenant,
  withTenant,
  invalidateTenantCache,
  disconnect,
  encryption,
  detectPii,
  retention,
  repos: {
    conversations,
    messages,
    customers,
    deals,
    tenants,
    auditLog,
  },
};
