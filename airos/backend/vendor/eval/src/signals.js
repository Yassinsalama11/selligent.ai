/**
 * Anonymized platform telemetry — Task 2-C3.
 *
 * Writes platform-wide signals to the platform_signals table (no tenant FK,
 * no raw text — aggregates and anonymized metrics only).
 *
 * Opt-in by default: if PLATFORM_TELEMETRY=0, emitSignal() is a no-op.
 *
 * Built-in signal types:
 *   "eval_score"      — { score, pass, model }
 *   "correction"      — { editType }               (no content)
 *   "stream_latency"  — { latencyMs, model }
 *   "budget_exceeded" — { plan }                   (anonymized)
 *
 * Custom signals may use any string type. Keep payload free of PII.
 */
const { getPrisma } = require('@chatorai/db');

/**
 * Emit a platform signal (fire-and-forget safe).
 *
 * @param {string} signalType
 * @param {object} payload      — anonymized, no tenant FK, no raw text
 * @param {string} [modelVersion]
 * @returns {Promise<void>}
 */
async function emitSignal(signalType, payload = {}, modelVersion) {
  if (process.env.PLATFORM_TELEMETRY === '0') return;
  if (!signalType) return;

  try {
    const prisma = getPrisma(); // platform signals live on the US (primary) cluster
    await prisma.platformSignal.create({
      data: {
        signalType,
        payload,
        modelVersion: modelVersion || null,
      },
    });
  } catch {
    // Never throw — telemetry must not affect hot paths
  }
}

/**
 * Convenience wrapper: emit an eval_score signal from a grade result.
 *
 * @param {{ score: number, pass: boolean, model?: string }} gradeResult
 */
async function emitEvalSignal(gradeResult) {
  await emitSignal(
    'eval_score',
    { score: gradeResult.score, pass: gradeResult.pass },
    gradeResult.model,
  );
}

/**
 * Convenience wrapper: emit a stream_latency signal.
 *
 * @param {{ latencyMs: number, model: string }} info
 */
async function emitLatencySignal({ latencyMs, model }) {
  await emitSignal('stream_latency', { latencyMs }, model);
}

module.exports = { emitSignal, emitEvalSignal, emitLatencySignal };
