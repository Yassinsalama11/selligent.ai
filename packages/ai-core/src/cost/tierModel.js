/**
 * Model tiering tables — ordered cheapest-last.
 * When budget pressure rises, we step right (toward cheaper models).
 */
const MODEL_TIERS = {
  anthropic: [
    'claude-opus-4-6',
    'claude-sonnet-4-6',
    'claude-haiku-4-5-20251001',
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
  ],
};

/**
 * Resolve which model to actually use given budget pressure.
 *
 * @param {'anthropic'|'openai'} provider
 * @param {string|undefined}     requestedModel  — model from the API call (or default)
 * @param {'green'|'yellow'|'red'} pressure
 * @returns {string}  — final model to use
 */
function applyPressure(provider, requestedModel, pressure) {
  const tiers = MODEL_TIERS[provider];
  if (!tiers) return requestedModel; // unknown provider — pass through

  const defaults = { anthropic: 'claude-haiku-4-5-20251001', openai: 'gpt-4o-mini' };
  const model = requestedModel || defaults[provider];

  const idx = tiers.indexOf(model);
  if (idx === -1) {
    // Model not in tier table — return as-is regardless of pressure
    return model;
  }

  const steps = pressure === 'yellow' ? 1 : pressure === 'red' ? 2 : 0;
  const tieredIdx = Math.min(idx + steps, tiers.length - 1);
  return tiers[tieredIdx];
}

module.exports = { MODEL_TIERS, applyPressure };
