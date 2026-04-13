/**
 * Lead Scorer — pure logic, no AI calls.
 * Adjusts the raw AI lead_score with business-rule signals
 * (repeat buyer, high spender, VIP tag, etc.) then maps
 * score → probability and stage recommendation.
 */

/**
 * @param {number} aiScore        - 0-100 from intentDetector
 * @param {object} customer       - DB customer row
 * @param {string} intent         - intent string from AI
 * @param {object} options
 * @returns {{ final_score: number, probability: number }}
 */
function scoreLeadFromAI(aiScore, customer = {}, intent, options = {}) {
  const settings = options.settings || {};
  const message = typeof options.message === 'string' ? options.message.toLowerCase() : '';
  const historyLength = Number.isInteger(options.historyLength) ? options.historyLength : 0;

  let score = aiScore;

  const activeRules = Array.isArray(settings.leadRules) && settings.leadRules.length > 0
    ? settings.leadRules.filter((rule) => rule?.active !== false)
    : null;

  if (activeRules) {
    for (const rule of activeRules) {
      if (matchesRule(rule?.signal, { message, intent, historyLength })) {
        score = clampScore(score + Number(rule.weight || 0));
      }
    }
  } else {
    // Keep the legacy defaults when no custom rules are configured.
    if ((customer.purchase_history || []).length > 0) score = Math.min(score + 10, 100);
    if ((customer.total_spent || 0) > 500) score = Math.min(score + 5, 100);
    if ((customer.tags || []).includes('vip')) score = Math.min(score + 10, 100);
    if (intent === 'complaint') score = Math.min(score, 30);
  }

  const companyScore = settings.compScore || {};
  if (companyScore.enabled !== false) {
    const purchaseCount = Array.isArray(customer.purchase_history) ? customer.purchase_history.length : 0;
    const totalSpent = Number(customer.total_spent || 0);

    if (totalSpent >= Number(companyScore.vipThreshold || 5000)) score = clampScore(score + 10);
    else if (totalSpent >= Number(companyScore.minRevenue || 1000)) score = clampScore(score + 5);

    if (purchaseCount >= Number(companyScore.minOrders || 3)) score = clampScore(score + 5);
  }

  return {
    final_score: score,
    probability: scoreToProbability(score),
  };
}

function matchesRule(signal, context) {
  if (typeof signal !== 'string') return false;
  const normalized = signal.toLowerCase();

  if (normalized.includes('buy/order keywords')) {
    return context.intent === 'ready_to_buy' || /\b(order|buy|طلب|عايز|أريد|ابغى)\b/i.test(context.message);
  }
  if (normalized.includes('replies within 5 minutes')) {
    return context.historyLength > 0;
  }
  if (normalized.includes('more than 3 messages')) {
    return context.historyLength >= 3;
  }
  if (normalized.includes('shares phone number')) {
    return /(\+?\d[\d\s-]{6,}\d)/.test(context.message);
  }
  if (normalized.includes('price objection')) {
    return context.intent === 'price_objection';
  }
  if (normalized.includes('return/refund')) {
    return context.intent === 'complaint' || /\b(refund|return|ارجاع|استرجاع)\b/i.test(context.message);
  }

  return false;
}

function clampScore(score) {
  return Math.max(0, Math.min(100, score));
}

function scoreToProbability(score) {
  if (score >= 80) return 80;
  if (score >= 60) return 55;
  if (score >= 40) return 30;
  if (score >= 20) return 15;
  return 5;
}

module.exports = { scoreLeadFromAI, scoreToProbability };
