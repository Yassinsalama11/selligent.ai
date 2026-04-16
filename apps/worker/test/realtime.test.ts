import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRealtimeEnvelope } from '../src/lib/realtime';

test('buildRealtimeEnvelope produces a socket bridge payload', () => {
  const envelope = buildRealtimeEnvelope('11111111-1111-1111-1111-111111111111', 'conversations', 'message:new', { ok: true });
  assert.equal(envelope.room, 'conversations');
  assert.equal(envelope.event, 'message:new');
  assert.deepEqual(envelope.payload, { ok: true });
});
