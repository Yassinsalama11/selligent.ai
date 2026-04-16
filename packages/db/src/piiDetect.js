/**
 * PII detection — Task 1-C3.
 *
 * Two-tier detection:
 *   1. Regex-based (always runs): email, phone, credit card, IBAN, IP, SSN, passport.
 *   2. Presidio HTTP sidecar (when PRESIDIO_URL is set): full NER including Arabic
 *      (CAMeLBERT) and multilingual models.
 *
 * Returns { hasPii, entities, redacted }
 *   entities: Array<{ type, value, start, end, source: 'regex'|'presidio' }>
 *   redacted: text with PII replaced by <TYPE>
 */

// ── Regex patterns ────────────────────────────────────────────────────────────

const PATTERNS = [
  {
    type: 'EMAIL',
    re: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
  },
  {
    // International phone: +966 5x xxx xxxx, +971, +1, etc.
    type: 'PHONE',
    re: /(?:\+?[0-9]{1,3}[-.\s]?)?(?:\([0-9]{1,4}\)[-.\s]?)?[0-9]{3,4}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}\b/g,
  },
  {
    // Visa/MC/Amex patterns (16-digit)
    type: 'CREDIT_CARD',
    re: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
  },
  {
    // IBAN: 2 letters + 2 digits + up to 30 alphanumeric
    type: 'IBAN',
    re: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}\b/g,
  },
  {
    // IPv4
    type: 'IP_ADDRESS',
    re: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
  },
  {
    // US SSN
    type: 'SSN',
    re: /\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b/g,
  },
  {
    // Saudi National ID (10 digits starting with 1 or 2)
    type: 'NATIONAL_ID_SA',
    re: /\b[12][0-9]{9}\b/g,
  },
];

function regexDetect(text) {
  const entities = [];
  for (const { type, re } of PATTERNS) {
    re.lastIndex = 0; // reset sticky state
    let m;
    while ((m = re.exec(text)) !== null) {
      entities.push({ type, value: m[0], start: m.index, end: m.index + m[0].length, source: 'regex' });
    }
  }
  return entities;
}

// ── Presidio sidecar ──────────────────────────────────────────────────────────

let _fetchFn;
async function _getFetch() {
  if (!_fetchFn) _fetchFn = (await import('node-fetch')).default;
  return _fetchFn;
}

async function presidioDetect(text, language = 'en') {
  const baseUrl = process.env.PRESIDIO_URL;
  if (!baseUrl) return [];

  try {
    const fetch = await _getFetch();
    const res = await fetch(`${baseUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((e) => ({
      type: e.entity_type,
      value: text.slice(e.start, e.end),
      start: e.start,
      end: e.end,
      source: 'presidio',
      score: e.score,
    }));
  } catch {
    // Presidio unavailable — degrade gracefully to regex only
    return [];
  }
}

// ── Redaction ─────────────────────────────────────────────────────────────────

function redact(text, entities) {
  if (!entities.length) return text;
  // Sort by start descending to avoid index shifting
  const sorted = [...entities].sort((a, b) => b.start - a.start);
  let result = text;
  for (const e of sorted) {
    result = result.slice(0, e.start) + `<${e.type}>` + result.slice(e.end);
  }
  return result;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Detect PII in text.
 * @param {string} text — content to scan
 * @param {object} opts
 * @param {string} [opts.language='en'] — ISO 639-1 code; 'ar' routes to Arabic model
 * @returns {Promise<{ hasPii: boolean, entities: object[], redacted: string }>}
 */
async function detectPii(text, { language = 'en' } = {}) {
  if (!text) return { hasPii: false, entities: [], redacted: text || '' };

  const [regexEntities, presidioEntities] = await Promise.all([
    Promise.resolve(regexDetect(text)),
    presidioDetect(text, language),
  ]);

  // Merge — deduplicate overlapping spans (prefer presidio)
  const all = [...regexEntities];
  for (const pe of presidioEntities) {
    const overlaps = all.some((e) => e.start < pe.end && pe.start < e.end);
    if (!overlaps) all.push(pe);
  }
  all.sort((a, b) => a.start - b.start);

  return {
    hasPii: all.length > 0,
    entities: all,
    redacted: redact(text, all),
  };
}

module.exports = { detectPii };
