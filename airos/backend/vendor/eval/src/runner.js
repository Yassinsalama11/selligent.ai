/**
 * Eval runner — executes a suite of test cases against `streamReply` and grades
 * each result with the Sonnet judge.
 *
 * A suite is an array of EvalCase objects:
 * {
 *   id: string,
 *   customerMessage: string,
 *   history?: [{ direction, content }],
 *   customer?: { name, phone },
 *   businessContext?: string,
 *   // Optional expected fields for hard assertions (no judge needed):
 *   expectedIntent?: string,
 *   minLeadScore?: number,
 *   maxLeadScore?: number,
 *   passThreshold?: number,   // override per-case judge threshold
 * }
 *
 * Returns a RunResult:
 * {
 *   suite: string,
 *   total: number,
 *   passed: number,
 *   failed: number,
 *   cases: [{ id, pass, score, reasoning, reply, intent, leadScore, durationMs, error? }]
 * }
 */
const { streamReply } = require('@chatorai/ai-core');
const { grade } = require('./judge');

/**
 * Collect the full text from a streamReply async generator.
 * Returns { text, model, usage, durationMs } or throws.
 */
async function collectStream(input) {
  const start = Date.now();
  let text = '';
  let model = '';
  let usage = {};
  for await (const chunk of streamReply(input)) {
    if (chunk.type === 'text') text += chunk.delta;
    else if (chunk.type === 'done') {
      text = chunk.text || text;
      model = chunk.model;
      usage = chunk.usage || {};
    }
  }
  return { text, model, usage, durationMs: Date.now() - start };
}

function parseJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

/**
 * Run a single eval case.
 */
async function runCase(evalCase, { provider, model, systemPrompt } = {}) {
  const start = Date.now();
  let result;

  try {
    const streamResult = await collectStream({
      provider: provider || 'anthropic',
      model,
      lastMessage: evalCase.customerMessage,
      history: evalCase.history || [],
      customer: evalCase.customer || {},
      systemPrompt,
    });

    const parsed = parseJson(streamResult.text);
    const suggestedReply = parsed?.suggested_reply || streamResult.text;
    const intent = parsed?.intent || null;
    const leadScore = parsed?.lead_score ?? null;

    // Hard assertions (don't need judge)
    const assertionFailures = [];
    if (evalCase.expectedIntent && intent !== evalCase.expectedIntent) {
      assertionFailures.push(`Expected intent "${evalCase.expectedIntent}", got "${intent}"`);
    }
    if (evalCase.minLeadScore != null && (leadScore === null || leadScore < evalCase.minLeadScore)) {
      assertionFailures.push(`Expected lead_score >= ${evalCase.minLeadScore}, got ${leadScore}`);
    }
    if (evalCase.maxLeadScore != null && (leadScore === null || leadScore > evalCase.maxLeadScore)) {
      assertionFailures.push(`Expected lead_score <= ${evalCase.maxLeadScore}, got ${leadScore}`);
    }

    // Judge scoring
    const judgeResult = await grade({
      customerMessage: evalCase.customerMessage,
      candidateReply: suggestedReply,
      businessContext: evalCase.businessContext,
      passThreshold: evalCase.passThreshold,
    });

    const pass = assertionFailures.length === 0 && judgeResult.pass;

    result = {
      id: evalCase.id,
      pass,
      score: judgeResult.score,
      reasoning: assertionFailures.length > 0
        ? `Assertion failed: ${assertionFailures.join('; ')}. Judge: ${judgeResult.reasoning}`
        : judgeResult.reasoning,
      reply: suggestedReply,
      intent,
      leadScore,
      durationMs: streamResult.durationMs,
    };
  } catch (err) {
    result = {
      id: evalCase.id,
      pass: false,
      score: 0,
      reasoning: `Error: ${err.message}`,
      reply: null,
      intent: null,
      leadScore: null,
      durationMs: Date.now() - start,
      error: err.message,
    };
  }

  return result;
}

/**
 * Run a full eval suite.
 *
 * @param {string} suiteName
 * @param {Array<object>} cases
 * @param {object} [opts]
 * @param {boolean} [opts.verbose]
 * @param {string}  [opts.provider]
 * @param {string}  [opts.model]
 * @param {string}  [opts.systemPrompt]
 * @returns {Promise<RunResult>}
 */
async function runSuite(suiteName, cases, opts = {}) {
  const results = [];

  for (const evalCase of cases) {
    const caseResult = await runCase(evalCase, opts);
    results.push(caseResult);
    if (opts.verbose) {
      const status = caseResult.pass ? 'PASS' : 'FAIL';
      process.stdout.write(`  [${status}] ${evalCase.id} — score=${caseResult.score} — ${caseResult.reasoning}\n`);
    }
  }

  const passed = results.filter((r) => r.pass).length;
  return {
    suite: suiteName,
    total: results.length,
    passed,
    failed: results.length - passed,
    cases: results,
  };
}

module.exports = { runSuite, runCase };
