const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createCampaign,
  previewAudience,
} = require('../src/db/queries/campaigns');

test('campaign audience preview keeps filters parameterized and tenant-scoped', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      return {
        rows: [{
          id: 'customer-1',
          name: 'Customer',
          phone: '+201000000000',
          address: '+201000000000',
        }],
      };
    },
  };

  const maliciousTag = "vip'); DROP TABLE customers; --";
  const result = await previewAudience('tenant-1', 'whatsapp', {
    tags: [maliciousTag],
    channels: ['whatsapp'],
    conversationStatus: 'open',
    assignedTo: 'unassigned',
    segment: 'loyal',
  }, client);

  assert.equal(result.count, 1);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /cu\.tenant_id = \$1/);
  assert.doesNotMatch(calls[0].sql, /DROP TABLE/);
  assert.deepEqual(calls[0].params[0], 'tenant-1');
  assert.ok(calls[0].params.some((param) => Array.isArray(param) && param.includes(maliciousTag)));
});

test('createCampaign stores tenant id, audience filter, and campaign payload separately', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (/INSERT INTO campaigns/.test(sql)) {
        return { rows: [{ id: 'campaign-1' }] };
      }
      return {
        rows: [{
          id: 'campaign-1',
          tenant_id: 'tenant-1',
          name: 'VIP Launch',
          description: '',
          channel: 'whatsapp',
          message_type: 'template',
          template_name: 'vip_launch',
          template_language: 'ar',
          body: 'Hello {{customer.name}}',
          variables: { 1: '{{customer.name}}' },
          audience_filter: { tags: ['VIP'] },
          status: 'draft',
          stats: {},
        }],
      };
    },
  };

  const campaign = await createCampaign('tenant-1', {
    name: 'VIP Launch',
    templateName: 'vip_launch',
    body: 'Hello {{customer.name}}',
    variables: { 1: '{{customer.name}}' },
    audienceFilter: { tags: ['VIP'] },
  }, 'user-1', client);

  assert.equal(campaign.id, 'campaign-1');
  assert.equal(campaign.tenant_id, 'tenant-1');
  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /INSERT INTO campaigns/);
  assert.equal(calls[0].params[0], 'tenant-1');
  assert.equal(calls[0].params[12], 'user-1');
  assert.equal(JSON.parse(calls[0].params[9]).tags[0], 'VIP');
});
