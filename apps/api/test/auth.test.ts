import test from 'node:test';
import assert from 'node:assert/strict';

import { decodeTenantFromAuthorization, signToken } from '../src/lib/auth';

test('auth helpers sign tokens and expose tenant ids for rate limiting', () => {
  const token = signToken({
    id: 'user-1',
    tenantId: '11111111-1111-1111-1111-111111111111',
    role: 'owner',
    email: 'owner@example.com',
  });

  const tenantId = decodeTenantFromAuthorization(`Bearer ${token}`);
  assert.equal(tenantId, '11111111-1111-1111-1111-111111111111');
});
