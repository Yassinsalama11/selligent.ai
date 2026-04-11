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
 * @returns {{ final_score: number, probability: number }}
 */
function scoreLeadFromAI(aiScore, customer = {}, intent) {
  let score = aiScore;

  // Boost for returning buyers
  if ((customer.purchase_history || []).length > 0) score = Math.min(score + 10, 100);

  // Boost for high-value customers
  if ((customer.total_spent || 0) > 500) score = Math.min(score + 5, 100);

  // VIP tag
  if ((customer.tags || []).includes('vip')) score = Math.min(score + 10, 100);

  // Complaint intent caps score
  if (intent === 'complaint') score = Math.min(score, 30);

  return {
    final_score: score,
    probability: scoreToProbability(score),
  };
}

function scoreToProbability(score) {
  if (score >= 80) return 80;
  if (score >= 60) return 55;
  if (score >= 40) return 30;
  if (score >= 20) return 15;
  return 5;
}

module.exports = { scoreLeadFromAI, scoreToProbability };
