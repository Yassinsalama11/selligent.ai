const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

let anthropicClient;
let openaiClient;

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

async function completeText({ prompt, maxTokens }) {
  const anthropic = getAnthropicClient();
  if (anthropic) {
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_AI_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.content[0].text.trim();
  }

  const openai = getOpenAIClient();
  if (openai) {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_AI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: maxTokens,
    });
    return response.choices[0].message.content.trim();
  }

  throw new Error('No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.');
}

module.exports = { completeText };
