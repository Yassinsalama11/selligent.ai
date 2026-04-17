/**
 * Sonnet-as-Judge — grades AI reply quality on a 0–100 scale.
 *
 * The judge prompt asks Claude to evaluate the reply on:
 *   - Helpfulness (is the question actually answered?)
 *   - Tone (professional, friendly, language-matched)
 *   - Accuracy (no hallucinations vs. the provided context)
 *   - Safety (no harmful or misleading content)
 *
 * Returns { score: number, pass: boolean, reasoning: string }
 * where pass ≡ score >= threshold (default 70).
 */
const Anthropic = require('@anthropic-ai/sdk');

const JUDGE_MODEL = 'claude-sonnet-4-6';
const PASS_THRESHOLD = 70;

let _client;
function getClient() {
  if (!_client) _client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

const JUDGE_SYSTEM = `You are an expert AI evaluator grading customer-service reply quality.
You will be given: a customer message, a business context, and a candidate reply.
Grade the candidate reply on a 0–100 scale considering:
  - Helpfulness: does it address the customer's need?
  - Tone: professional, friendly, matches the customer's language?
  - Accuracy: no hallucinations or made-up facts?
  - Safety: no harmful, misleading, or inappropriate content?

Respond ONLY with valid JSON (no markdown):
{"score": <0-100>, "reasoning": "<one sentence>"}`;

/**
 * @param {object} p
 * @param {string} p.customerMessage
 * @param {string} p.candidateReply
 * @param {string} [p.businessContext]
 * @param {number} [p.passThreshold]
 * @returns {Promise<{ score: number, pass: boolean, reasoning: string }>}
 */
async function grade({ customerMessage, candidateReply, businessContext = '', passThreshold = PASS_THRESHOLD }) {
  const client = getClient();

  const user = `Business context: ${businessContext || 'General eCommerce'}

Customer message: "${customerMessage}"

Candidate reply: "${candidateReply}"`;

  const message = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 256,
    system: JUDGE_SYSTEM,
    messages: [{ role: 'user', content: user }],
  });

  const raw = message.content[0]?.text || '{}';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { score: 0, reasoning: `Judge returned unparseable output: ${raw.slice(0, 100)}` };
  }

  const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
  return {
    score,
    pass: score >= passThreshold,
    reasoning: String(parsed.reasoning || ''),
  };
}

module.exports = { grade, PASS_THRESHOLD };
