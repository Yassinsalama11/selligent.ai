'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { verifyMetaSignature } = require('../src/channels/verify');

const SECRET = 'test_secret_abc123';

function makeSignature(secret, body) {
  return 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
}

test('verifyMetaSignature - valid signature returns true', () => {
  const body = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account' }));
  const sig = makeSignature(SECRET, body);
  assert.equal(verifyMetaSignature(SECRET, body, sig), true);
});

test('verifyMetaSignature - missing signature header returns false', () => {
  const body = Buffer.from('{}');
  assert.equal(verifyMetaSignature(SECRET, body, undefined), false);
  assert.equal(verifyMetaSignature(SECRET, body, ''), false);
});

test('verifyMetaSignature - missing secret returns false', () => {
  const body = Buffer.from('{}');
  const sig = makeSignature(SECRET, body);
  assert.equal(verifyMetaSignature('', body, sig), false);
  assert.equal(verifyMetaSignature(undefined, body, sig), false);
});

test('verifyMetaSignature - tampered body returns false', () => {
  const original = Buffer.from('{"object":"whatsapp_business_account"}');
  const sig = makeSignature(SECRET, original);
  const tampered = Buffer.from('{"object":"whatsapp_business_account","injected":true}');
  assert.equal(verifyMetaSignature(SECRET, tampered, sig), false);
});

test('verifyMetaSignature - wrong secret returns false', () => {
  const body = Buffer.from('{}');
  const sig = makeSignature('wrong_secret', body);
  assert.equal(verifyMetaSignature(SECRET, body, sig), false);
});

test('verifyMetaSignature - header without sha256= prefix returns false', () => {
  const body = Buffer.from('{}');
  const raw = crypto.createHmac('sha256', SECRET).update(body).digest('hex');
  assert.equal(verifyMetaSignature(SECRET, body, raw), false);
});
