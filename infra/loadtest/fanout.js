import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

import { SOCKET_BASE_URL, SOCKET_ORIGIN, TENANT_ID, TEST_RUN_ID, randomId, resolveAuthToken } from './common.js';

const engineOpenRate = new Rate('chatorai_socket_engine_open_rate');
const namespaceConnectRate = new Rate('chatorai_socket_namespace_connect_rate');
const socketEventRate = new Rate('chatorai_socket_event_receive_rate');
const socketMessages = new Counter('chatorai_socket_packets_received_total');
const socketConnectLatency = new Trend('chatorai_socket_connect_latency_ms', true);

const targetVus = Number(__ENV.SOCKET_TARGET_VUS || 10000);
const socketPath = (__ENV.SOCKET_PATH || '/socket.io/').replace(/\/?$/, '/');
const holdMs = Number(__ENV.SOCKET_HOLD_MS || 60000);
const sendMessageEvery = Number(__ENV.SOCKET_SEND_MESSAGE_EVERY || 250);
const stage1Duration = __ENV.SOCKET_STAGE1_DURATION || '1m';
const stage2Duration = __ENV.SOCKET_STAGE2_DURATION || '2m';
const stage3Duration = __ENV.SOCKET_STAGE3_DURATION || '3m';
const stage1Target = Number(__ENV.SOCKET_STAGE1_TARGET || Math.max(200, Math.floor(targetVus * 0.1)));
const stage2Target = Number(__ENV.SOCKET_STAGE2_TARGET || Math.max(1000, Math.floor(targetVus * 0.5)));
const stage3Target = Number(__ENV.SOCKET_STAGE3_TARGET || targetVus);

export const options = {
  scenarios: {
    fanout: {
      executor: 'ramping-vus',
      exec: 'holdSocket',
      startVUs: 0,
      stages: [
        { duration: stage1Duration, target: stage1Target },
        { duration: stage2Duration, target: stage2Target },
        { duration: stage3Duration, target: stage3Target },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'fanout' },
    },
  },
  thresholds: {
    checks: ['rate>0.98'],
    chatorai_socket_engine_open_rate: ['rate>0.98'],
    chatorai_socket_namespace_connect_rate: ['rate>0.98'],
    chatorai_socket_connect_latency_ms: ['p(95)<2000', 'p(99)<5000'],
  },
};

export function setup() {
  return {
    token: resolveAuthToken(),
  };
}

export function holdSocket(data) {
  const sessionId = randomId('session');
  const query = `EIO=4&transport=websocket&tenantId=${encodeURIComponent(TENANT_ID)}&token=${encodeURIComponent(data.token)}&sessionId=${encodeURIComponent(sessionId)}`;
  const url = `${SOCKET_BASE_URL.replace(/^http/, 'ws')}${socketPath}?${query}`;
  const startedAt = Date.now();

  const response = ws.connect(
    url,
    {
      headers: {
        Origin: SOCKET_ORIGIN,
      },
      tags: {
        endpoint: socketPath,
        test_type: 'fanout',
      },
    },
    (socket) => {
      let namespaceConnected = false;

      socket.on('open', () => {
        socketConnectLatency.add(Date.now() - startedAt);
      });

      socket.on('message', (message) => {
        if (message.startsWith('0{')) {
          engineOpenRate.add(true);
          socket.send('40');
          return;
        }

        if (message === '2') {
          socket.send('3');
          return;
        }

        if (message === '40' || message.startsWith('40{')) {
          namespaceConnected = true;
          namespaceConnectRate.add(true);
          if (__VU % sendMessageEvery === 0) {
            socket.send(`42["customer:message",${JSON.stringify({
              channelCustomerId: randomId('socket-customer'),
              customer: { name: `Socket Load ${__VU}` },
              message: {
                type: 'text',
                direction: 'inbound',
                sentBy: 'customer',
                content: `fanout ping ${TEST_RUN_ID}`,
                metadata: {
                  test_run_id: TEST_RUN_ID,
                  socket_vu: __VU,
                },
              },
            })}]`);
          }
          return;
        }

        if (message.startsWith('42')) {
          socketMessages.add(1);
          socketEventRate.add(true);
        }
      });

      socket.on('error', () => {
        engineOpenRate.add(false);
        if (!namespaceConnected) {
          namespaceConnectRate.add(false);
        }
      });

      socket.setTimeout(() => {
        socket.close();
      }, holdMs);
    },
  );

  check(response, {
    'socket handshake upgraded': (res) => res && res.status === 101,
  });

  sleep(Number(__ENV.SOCKET_SLEEP_SECONDS || 0));
}
