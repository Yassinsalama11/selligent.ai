/**
 * Token budget management for AI calls.
 *
 * Tracks daily and monthly token usage per tenant in `tenant_token_budgets`.
 * Automatically resets counters when calendar day / month rolls over (no cron needed —
 * the reset is embedded in the atomic UPSERT).
 *
 * Pressure levels:
 *   green  — < 70% of the tighter cap used
 *   yellow — 70–90%
 *   red    — > 90%  (model auto-tiers to cheapest; hard-cap throws at 100%)
 */
const { getPrisma } = require('@chatorai/db');
const { applyPressure } = require('./tierModel');

// Default caps in tokens (can be overridden via env)
const DEFAULT_DAILY_CAP   = Number(process.env.AI_DEFAULT_DAILY_CAP)   || 500_000;
const DEFAULT_MONTHLY_CAP = Number(process.env.AI_DEFAULT_MONTHLY_CAP) || 10_000_000;

/**
 * Fetch or lazily-create a budget row for the tenant.
 * Returns the row with resets applied.
 *
 * @param {string} tenantId
 * @returns {Promise<{ dailyCap, monthlyCap, dailyUsed, monthlyUsed }>}
 */
async function fetchBudget(tenantId) {
  const prisma = getPrisma();

  // Upsert a fresh row for new tenants; existing tenants get the stored caps
  await prisma.$executeRaw`
    INSERT INTO tenant_token_budgets (tenant_id, daily_cap, monthly_cap, last_reset_day, last_reset_month)
    VALUES (
      ${tenantId}::uuid,
      ${DEFAULT_DAILY_CAP},
      ${DEFAULT_MONTHLY_CAP},
      CURRENT_DATE,
      DATE_TRUNC('month', CURRENT_DATE)::date
    )
    ON CONFLICT (tenant_id) DO UPDATE SET
      -- Reset daily counter if the calendar day has advanced
      daily_used = CASE
        WHEN tenant_token_budgets.last_reset_day < CURRENT_DATE THEN 0
        ELSE tenant_token_budgets.daily_used
      END,
      last_reset_day = CASE
        WHEN tenant_token_budgets.last_reset_day < CURRENT_DATE THEN CURRENT_DATE
        ELSE tenant_token_budgets.last_reset_day
      END,
      -- Reset monthly counter if the calendar month has advanced
      monthly_used = CASE
        WHEN tenant_token_budgets.last_reset_month < DATE_TRUNC('month', CURRENT_DATE)::date THEN 0
        ELSE tenant_token_budgets.monthly_used
      END,
      last_reset_month = CASE
        WHEN tenant_token_budgets.last_reset_month < DATE_TRUNC('month', CURRENT_DATE)::date
          THEN DATE_TRUNC('month', CURRENT_DATE)::date
        ELSE tenant_token_budgets.last_reset_month
      END
  `;

  return prisma.tenantTokenBudget.findUnique({ where: { tenantId } });
}

/**
 * Compute budget pressure from a fetched row.
 *
 * @param {{ dailyCap, monthlyCap, dailyUsed, monthlyUsed }} row
 * @returns {{ pressure: 'green'|'yellow'|'red', dailyPct: number, monthlyPct: number, overCap: boolean }}
 */
function computePressure(row) {
  const dailyPct   = row.dailyCap   > 0 ? row.dailyUsed   / row.dailyCap   : 0;
  const monthlyPct = row.monthlyCap > 0 ? row.monthlyUsed / row.monthlyCap : 0;
  const maxPct = Math.max(dailyPct, monthlyPct);

  const overCap = maxPct >= 1.0;
  const pressure = maxPct >= 0.9 ? 'red' : maxPct >= 0.7 ? 'yellow' : 'green';

  return { pressure, dailyPct, monthlyPct, overCap };
}

/**
 * Check the current budget pressure for a tenant.
 * Silently returns green if the DB call fails (don't block AI on budget check errors).
 *
 * @param {string} tenantId
 * @returns {Promise<{ pressure, dailyPct, monthlyPct, overCap }>}
 */
async function checkBudget(tenantId) {
  try {
    const row = await fetchBudget(tenantId);
    if (!row) return { pressure: 'green', dailyPct: 0, monthlyPct: 0, overCap: false };
    return computePressure(row);
  } catch {
    return { pressure: 'green', dailyPct: 0, monthlyPct: 0, overCap: false };
  }
}

/**
 * Record token usage after a completed AI call (best-effort, never throws).
 *
 * @param {string} tenantId
 * @param {number} tokensIn
 * @param {number} tokensOut
 */
async function recordUsage(tenantId, tokensIn, tokensOut) {
  const total = (tokensIn || 0) + (tokensOut || 0);
  if (!total) return;

  const prisma = getPrisma();
  try {
    await prisma.$executeRaw`
      INSERT INTO tenant_token_budgets (tenant_id, daily_cap, monthly_cap, daily_used, monthly_used, last_reset_day, last_reset_month)
      VALUES (
        ${tenantId}::uuid,
        ${DEFAULT_DAILY_CAP},
        ${DEFAULT_MONTHLY_CAP},
        ${total},
        ${total},
        CURRENT_DATE,
        DATE_TRUNC('month', CURRENT_DATE)::date
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        daily_used = CASE
          WHEN tenant_token_budgets.last_reset_day < CURRENT_DATE THEN ${total}
          ELSE tenant_token_budgets.daily_used + ${total}
        END,
        monthly_used = CASE
          WHEN tenant_token_budgets.last_reset_month < DATE_TRUNC('month', CURRENT_DATE)::date THEN ${total}
          ELSE tenant_token_budgets.monthly_used + ${total}
        END,
        last_reset_day = CASE
          WHEN tenant_token_budgets.last_reset_day < CURRENT_DATE THEN CURRENT_DATE
          ELSE tenant_token_budgets.last_reset_day
        END,
        last_reset_month = CASE
          WHEN tenant_token_budgets.last_reset_month < DATE_TRUNC('month', CURRENT_DATE)::date
            THEN DATE_TRUNC('month', CURRENT_DATE)::date
          ELSE tenant_token_budgets.last_reset_month
        END
    `;
  } catch {
    // Best-effort — never fail the caller
  }
}

/**
 * Pick the model to use given tenant budget pressure.
 * Throws BudgetExceededError if the tenant is strictly over cap.
 *
 * @param {string}              tenantId
 * @param {'anthropic'|'openai'} provider
 * @param {string|undefined}    requestedModel
 * @returns {Promise<string>}   final model name
 */
async function selectModel(tenantId, provider, requestedModel) {
  const { pressure, overCap } = await checkBudget(tenantId);

  if (overCap) {
    const err = new Error(`Token budget exceeded for tenant ${tenantId}`);
    err.code = 'BUDGET_EXCEEDED';
    throw err;
  }

  return applyPressure(provider, requestedModel, pressure);
}

module.exports = { checkBudget, recordUsage, selectModel };
