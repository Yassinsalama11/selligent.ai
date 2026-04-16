const { getPrisma, withTenant, disconnect } = require('./client');
const conversations = require('./repos/conversations');
const messages = require('./repos/messages');
const customers = require('./repos/customers');
const deals = require('./repos/deals');
const tenants = require('./repos/tenants');
const auditLog = require('./repos/auditLog');

module.exports = {
  getPrisma,
  withTenant,
  disconnect,
  repos: {
    conversations,
    messages,
    customers,
    deals,
    tenants,
    auditLog,
  },
};
