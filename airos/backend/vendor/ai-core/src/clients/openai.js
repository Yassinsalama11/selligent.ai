const OpenAI = require('openai');

let _client;
function client() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

const DEFAULT_MODEL = 'gpt-4o-mini';

async function* stream({ model = DEFAULT_MODEL, system, messages, maxTokens = 512, temperature = 0.4 }) {
  const start = Date.now();
  const finalMessages = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages;

  const response = await client().chat.completions.create({
    model,
    messages: finalMessages,
    max_tokens: maxTokens,
    temperature,
    stream: true,
    stream_options: { include_usage: true },
  });

  let text = '';
  let inputTokens = 0;
  let outputTokens = 0;

  for await (const chunk of response) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      text += delta;
      yield { type: 'text', delta };
    }
    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens || inputTokens;
      outputTokens = chunk.usage.completion_tokens || outputTokens;
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
