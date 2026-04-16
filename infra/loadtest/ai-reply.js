import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

import { API_BASE_URL, TEST_RUN_ID, TENANT_ID, jsonParams, resolveAuthToken } from './common.js';

const sseDoneRate = new Rate('chatorai_ai_reply_done_rate');
const sseDoneCount = new Counter('chatorai_ai_reply_done_total');

export const options = {
  scenarios: {
    ai_reply: {
      executor: 'constant-vus',
      vus: Number(__ENV.AI_REPLY_VUS || 100),
      duration: __ENV.AI_REPLY_DURATION || '5m',
      exec: 'generateReply',
      tags: { test_type: 'ai-reply' },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<8000', 'p(99)<15000'],
    chatorai_ai_reply_done_rate: ['rate>0.98'],
  },
};

export function setup() {
  return {
    token: resolveAuthToken(),
  };
}

export function generateReply(data) {
  const payload = {
    conversationId: __ENV.LOADTEST_CONVERSATION_ID || undefined,
    lastMessage: `Customer asks about pricing ${__ITER}`,
    customer: {
      name: `Load Test ${__VU}`,
      phone: __ENV.LOADTEST_CUSTOMER_PHONE || '+15550000000',
    },
    history: [
      {
        direction: 'inbound',
        content: 'Hello, I want to know more about your plans.',
      },
      {
        direction: 'outbound',
        content: 'Sure, which plan are you interested in?',
      },
    ],
    provider: __ENV.AI_PROVIDER || undefined,
    model: __ENV.AI_MODEL || undefined,
    temperature: Number(__ENV.AI_TEMPERATURE || 0.3),
    maxTokens: Number(__ENV.AI_MAX_TOKENS || 512),
    systemPrompt: __ENV.AI_SYSTEM_PROMPT || undefined,
    metadata: {
      test_run_id: TEST_RUN_ID,
      tenant_id: TENANT_ID,
    },
  };

  const response = http.post(
    `${API_BASE_URL}/v1/ai/reply`,
    JSON.stringify(payload),
    {
      ...jsonParams(
        {
          Authorization: `Bearer ${data.token}`,
          Accept: 'text/event-stream',
        },
        { endpoint: '/v1/ai/reply', test_type: 'ai-reply' },
      ),
      timeout: __ENV.AI_REPLY_TIMEOUT || '120s',
    },
  );

  const done = check(response, {
    'ai reply returns SSE 200': (res) => res.status === 200,
    'ai reply emits done event': (res) => typeof res.body === 'string' && res.body.includes('event: done'),
  });

  sseDoneRate.add(done);
  if (done) {
    sseDoneCount.add(1);
  }

  sleep(Number(__ENV.AI_REPLY_SLEEP_SECONDS || 0));
}
