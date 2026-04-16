const { runSuite, runCase } = require('./runner');
const { runRedteam, safetyGrade } = require('./redteam');
const { grade: gradeQuality } = require('./judge');
const { scoreProductionReply } = require('./production');
const { runMiner } = require('./miner');
const { emitSignal, emitEvalSignal, emitLatencySignal } = require('./signals');
const { CASES: GOLDEN_CASES } = require('./suites/golden');
const { CASES: REDTEAM_CASES, JAILBREAK_PROBES, PII_LEAK_PROBES, PROMPT_INJECTION_PROBES } = require('./suites/redteam');

module.exports = {
  runSuite,
  runCase,
  runRedteam,
  gradeQuality,
  safetyGrade,
  scoreProductionReply,
  runMiner,
  signals: { emitSignal, emitEvalSignal, emitLatencySignal },
  suites: {
    golden: GOLDEN_CASES,
    redteam: REDTEAM_CASES,
    jailbreakProbes: JAILBREAK_PROBES,
    piiLeakProbes: PII_LEAK_PROBES,
    promptInjectionProbes: PROMPT_INJECTION_PROBES,
  },
};
