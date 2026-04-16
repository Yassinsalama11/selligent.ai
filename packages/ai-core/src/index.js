const { streamReply, buildPrompt } = require('./streamReply');
const anthropic = require('./clients/anthropic');
const openai = require('./clients/openai');
const registry = require('./registry');
const cost = require('./cost');
const { generateBusinessProfile, ProfileSchema } = require('./understand');
const { generateInitialSettings, SettingsSchema } = require('./understand/settingsGenerator');
const { TenantAgent } = require('./agent');
const memory = require('./memory');

module.exports = {
  streamReply,
  buildPrompt,
  registry,
  cost,
  clients: { anthropic, openai },
  understand: { generateBusinessProfile, ProfileSchema },
  settings: { generateInitialSettings, SettingsSchema },
  TenantAgent,
  memory,
};
