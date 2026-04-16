const crypto = require('crypto');
const OpenAI = require('openai');

function hashEmbedding(text, dimensions = 64) {
  const hash = crypto.createHash('sha256').update(String(text || '')).digest();
  return Array.from({ length: dimensions }, (_, index) => {
    const value = hash[index % hash.length];
    return Number(((value / 255) * 2 - 1).toFixed(6));
  });
}

async function embedText(text) {
  if (!process.env.OPENAI_API_KEY) {
    return hashEmbedding(text);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    input: String(text || '').slice(0, 12000),
  });

  return response.data?.[0]?.embedding || hashEmbedding(text);
}

module.exports = { embedText, hashEmbedding };
