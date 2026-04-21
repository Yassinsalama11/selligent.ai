const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');

process.env.ADMIN_JWT_SECRET ||= 'test-admin-secret-for-totp';

const {
  _test: {
    decryptTotpSecret,
    encryptTotpSecret,
    signTotpChallengeToken,
    verifyTotpCode,
  },
} = require('../src/api/routes/admin');

test('TOTP secret encryption round-trips without storing plaintext', () => {
  const secret = authenticator.generateSecret();
  const encrypted = encryptTotpSecret(secret);

  assert.notEqual(encrypted, secret);
  assert.doesNotMatch(encrypted, new RegExp(secret));
  assert.equal(encrypted.split(':').length, 3);
  assert.equal(decryptTotpSecret(encrypted), secret);
});

test('TOTP code verification accepts current code and rejects invalid code', () => {
  const secret = authenticator.generateSecret();
  const code = authenticator.generate(secret);

  assert.equal(verifyTotpCode(secret, code), true);
  assert.equal(verifyTotpCode(secret, '000000'), false);
  assert.equal(verifyTotpCode(secret, 'not-a-code'), false);
});

test('TOTP challenge token is short lived and scoped only for MFA verification', () => {
  const token = signTotpChallengeToken({
    id: 'admin-id',
    email: 'admin@example.com',
    name: 'Admin',
    role: 'platform_admin',
  });
  const payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

  assert.equal(payload.scope, 'admin_totp_challenge');
  assert.equal(payload.id, 'admin-id');
  assert.ok(payload.exp - payload.iat <= 5 * 60);
});
