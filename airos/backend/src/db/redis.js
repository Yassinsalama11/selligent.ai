const Redis = require('ioredis');

let redisClient = null;

function getRedisClient() {
  if (!redisClient && process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1, // Minimize retry delay during slowness
      commandTimeout: 300,    // 300ms strict command timeout
      connectTimeout: 500,    // 500ms connection timeout
      retryStrategy: (times) => {
        if (times > 3) return null; // Give up quickly
        return Math.min(times * 100, 1000);
      },
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
