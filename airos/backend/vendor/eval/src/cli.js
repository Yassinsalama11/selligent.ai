#!/usr/bin/env node
/**
 * chatorai-eval CLI
 *
 * Usage:
 *   chatorai-eval run --suite golden [--provider anthropic] [--model claude-haiku-4-5-20251001] [--verbose] [--ci]
 *   chatorai-eval run --suite redteam [--verbose] [--ci]
 *   chatorai-eval run --suite all     [--verbose] [--ci]
 *
 * --ci: exits with code 1 if any case fails (for CI gate usage).
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

const { runSuite } = require('./runner');
const { runRedteam } = require('./redteam');
const { CASES: GOLDEN_CASES } = require('./suites/golden');
const { CASES: REDTEAM_CASES } = require('./suites/redteam');

function printSummary(result) {
  const pct = result.total > 0 ? ((result.passed ?? result.safe) / result.total * 100).toFixed(1) : '0.0';
  console.log(`\n── ${result.suite} ──`);
  console.log(`  Total : ${result.total}`);

  if (result.suite === 'redteam') {
    console.log(`  Safe  : ${result.safe}`);
    console.log(`  Vulnbl: ${result.vulnerable}`);
    if (result.byType) {
      for (const [type, stats] of Object.entries(result.byType)) {
        console.log(`    ${type.padEnd(20)} ${stats.safe}/${stats.total} safe`);
      }
    }
  } else {
    console.log(`  Passed: ${result.passed}`);
    console.log(`  Failed: ${result.failed}`);
  }
  console.log(`  Rate  : ${pct}%`);
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd !== 'run') {
    console.error('Usage: chatorai-eval run --suite <golden|redteam|all> [--verbose] [--ci]');
    process.exit(1);
  }

  const suiteArg = args[args.indexOf('--suite') + 1] || 'golden';
  const verbose   = args.includes('--verbose');
  const ci        = args.includes('--ci');
  const provider  = args.includes('--provider') ? args[args.indexOf('--provider') + 1] : 'anthropic';
  const model     = args.includes('--model')    ? args[args.indexOf('--model') + 1]    : undefined;

  const opts = { verbose, provider, model };
  const allResults = [];

  if (suiteArg === 'golden' || suiteArg === 'all') {
    console.log(`\nRunning golden suite (${GOLDEN_CASES.length} cases)…`);
    const result = await runSuite('golden', GOLDEN_CASES, opts);
    printSummary(result);
    allResults.push(result);
  }

  if (suiteArg === 'redteam' || suiteArg === 'all') {
    console.log(`\nRunning red-team suite (${REDTEAM_CASES.length} probes)…`);
    const result = await runRedteam(REDTEAM_CASES, opts);
    printSummary(result);
    // wrap to uniform shape for ci check
    result.passed = result.safe;
    result.failed = result.vulnerable;
    allResults.push(result);
  }

  if (allResults.length === 0) {
    console.error(`Unknown suite: ${suiteArg}. Use golden, redteam, or all.`);
    process.exit(1);
  }

  const totalFailed = allResults.reduce((sum, r) => sum + (r.failed || 0), 0);
  if (ci && totalFailed > 0) {
    console.error(`\nCI gate: ${totalFailed} case(s) failed.`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
