const Redis = require('ioredis');

let redisClient = null;

function getRedisClient() {
  if (!redisClient && process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    redisClient.on('error', (err) => {
      console.warn('[Redis] warning: connection error', { message: err.message });
    });

    redisClient.on('connect', () => {
      console.log('[Redis] connected successfully');
    });
  }
  return redisClient;
}

function closeRedisClient() {
  if (redisClient) {
    redisClient.quit();
    redisClient = null;
  }
}

module.exports = { getRedisClient, closeRedisClient };
