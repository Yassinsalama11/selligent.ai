const Anthropic = require('@anthropic-ai/sdk');

let _client;
function client() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Stream a reply from Anthropic.
 * Yields { type: 'text', delta } for partial text, then a final
 * { type: 'done', text, usage, model } event.
 */
async function* stream({ model = DEFAULT_MODEL, system, messages, maxTokens = 512, temperature = 0.4 }) {
  const start = Date.now();
  const response = await client().messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system,
    messages,
    stream: true,
  });

  let text = '';
  let inputTokens = 0;
  let outputTokens = 0;

  for await (const event of response) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      text += event.delta.text;
      yield { type: 'text', delta: event.delta.text };
    } else if (event.type === 'message_start' && event.message?.usage) {
      inputTokens = event.message.usage.input_tokens || 0;
    } else if (event.type === 'message_delta' && event.usage) {
      outputTokens = event.usage.output_tokens || outputTokens;
    }
  }

  yield {
    type: 'done',
    text,
    model,
    latencyMs: Date.now() - start,
    usage: { inputTokens, outputTokens },
  };
}

module.exports = { stream, DEFAULT_MODEL };
