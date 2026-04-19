'use strict';

const crypto = require('crypto');

/**
 * Verifies the X-Hub-Signature-256 header sent by Meta on all webhook POSTs.
 *
 * @param {string} secret
 * @param {Buffer} rawBody
 * @param {string|undefined} signatureHeader
 * @returns {boolean}
 */
function verifyMetaSignature(secret, rawBody, signatureHeader) {
  // Fail closed: no secret configured means all requests are rejected.
  if (!secret || !signatureHeader) return false;

  // Header format: "sha256=<hexdigest>"
  if (!signatureHeader.startsWith('sha256=')) return false;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // Must be same length before timingSafeEqual to avoid RangeError
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

module.exports = { verifyMetaSignature };
