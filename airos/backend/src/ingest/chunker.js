function estimateTokens(text = '') {
  return Math.ceil(String(text).trim().split(/\s+/).filter(Boolean).length * 1.35);
}

function chunkContent({ url, title, content }, options = {}) {
  const minTokens = options.minTokens || 500;
  const maxTokens = options.maxTokens || 1200;
  const overlapRatio = options.overlapRatio || 0.15;
  const paragraphs = String(content || '')
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const chunks = [];
  let current = [];
  let currentTokens = 0;

  function flush() {
    if (!current.length) return;
    const text = current.join('\n\n').trim();
    if (!text) return;

    chunks.push({
      sourceUrl: url,
      title,
      heading: current[0]?.replace(/^#+\s*/, '').slice(0, 180) || title,
      content: text,
      tokenCount: estimateTokens(text),
    });

    const overlapCount = Math.max(1, Math.floor(current.length * overlapRatio));
    current = current.slice(-overlapCount);
    currentTokens = estimateTokens(current.join('\n\n'));
  }

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);
    if (currentTokens + paragraphTokens > maxTokens && currentTokens >= minTokens) {
      flush();
    }
    current.push(paragraph);
    currentTokens += paragraphTokens;
  }

  flush();

  if (!chunks.length && content) {
    chunks.push({
      sourceUrl: url,
      title,
      heading: title,
      content,
      tokenCount: estimateTokens(content),
    });
  }

  return chunks;
}

module.exports = { chunkContent, estimateTokens };
