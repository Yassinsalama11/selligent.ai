import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

import { API_BASE_URL, TENANT_ID, TEST_RUN_ID, jsonParams, randomId } from './common.js';

const acceptedRate = new Rate('chatorai_ingest_accept_rate');
const acceptedCount = new Counter('chatorai_ingest_accept_total');

const targetRate = Number(__ENV.INGEST_RATE || 500);
const steadyDuration = __ENV.INGEST_DURATION || '5m';
const stage1Duration = __ENV.INGEST_STAGE1_DURATION || '1m';
const stage2Duration = __ENV.INGEST_STAGE2_DURATION || '2m';
const stage1Target = Number(__ENV.INGEST_STAGE1_TARGET || Math.max(50, Math.floor(targetRate * 0.25)));
const stage2Target = Number(__ENV.INGEST_STAGE2_TARGET || targetRate);

export const options = {
  scenarios: {
    ingest: {
      executor: 'ramping-arrival-rate',
      exec: 'ingestWebhook',
      preAllocatedVUs: Number(__ENV.INGEST_PREALLOCATED_VUS || 100),
      maxVUs: Number(__ENV.INGEST_MAX_VUS || 1000),
      timeUnit: '1s',
      stages: [
        { duration: stage1Duration, target: stage1Target },
        { duration: stage2Duration, target: stage2Target },
        { duration: steadyDuration, target: targetRate },
      ],
      tags: { test_type: 'ingest' },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<750', 'p(99)<1500'],
    chatorai_ingest_accept_rate: ['rate>0.99'],
  },
};

export function ingestWebhook() {
  const payload = {
    channelCustomerId: randomId('customer'),
    customer: {
      name: `Load Test ${__VU}`,
      email: `loadtest+${__VU}-${__ITER}@example.com`,
    },
    message: {
      type: 'text',
      direction: 'inbound',
      sentBy: 'customer',
      content: `ingest load test message ${__ITER}`,
      metadata: {
        test_run_id: TEST_RUN_ID,
        vu: __VU,
        iter: __ITER,
      },
    },
    raw: {
      source: 'k6-ingest',
      test_run_id: TEST_RUN_ID,
    },
  };

  const response = http.post(
    `${API_BASE_URL}/v1/webhooks/livechat?tenantId=${TENANT_ID}`,
    JSON.stringify(payload),
    jsonParams({}, { endpoint: '/v1/webhooks/livechat', test_type: 'ingest' }),
  );

  const accepted = check(response, {
    'ingest webhook accepted': (res) => res.status === 202,
  });

  acceptedRate.add(accepted);
  if (accepted) {
    acceptedCount.add(1);
  }

  sleep(Number(__ENV.INGEST_SLEEP_SECONDS || 0));
}
