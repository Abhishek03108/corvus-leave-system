import { createClient } from 'redis';

let client;
let useLocalFallback = false;

const localStore = new Map();

export const connectRedis = async () => {
  try {
    // ==============================
    // Render / Production Redis URL
    // ==============================
    if (process.env.REDIS_URL) {
      client = createClient({
        url: process.env.REDIS_URL,
      });
    }

    // ==============================
    // Local Redis
    // ==============================
    else {
      client = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          reconnectStrategy: () => false,
        },
      });
    }

    client.on('error', (err) => {
      console.error('[Redis] Client Error:', err.message);

      if (process.env.NODE_ENV === 'production') {
        console.error('[Redis] Fatal Error: Redis is required in production.');
        process.exit(1);
      }

      useLocalFallback = true;
    });

    client.on('connect', () => {
      console.log('[Redis] Connected successfully.');
      useLocalFallback = false;
    });

    await client.connect();
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[Redis] Fatal Error: Redis is required in production.',
        err.message
      );

      process.exit(1);
    }

    console.warn(
      '[Redis] Connection failed, using in-memory local cache fallback.',
      err.message
    );

    useLocalFallback = true;
  }
};

export const getRedis = () => {
  if (useLocalFallback || !client) {
    return null;
  }

  return client;
};

// =========================================
// OTP Helpers
// =========================================

export const setOTP = async (email, otp, ttlSeconds) => {
  const key = `otp:${email}`;

  const redisClient = getRedis();

  if (redisClient) {
    await redisClient.setEx(key, ttlSeconds, otp);
  } else {
    localStore.set(key, {
      value: otp,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
};

export const getOTP = async (email) => {
  const key = `otp:${email}`;

  const redisClient = getRedis();

  if (redisClient) {
    return await redisClient.get(key);
  } else {
    const data = localStore.get(key);

    if (!data) return null;

    if (Date.now() > data.expiresAt) {
      localStore.delete(key);
      return null;
    }

    return data.value;
  }
};

export const deleteOTP = async (email) => {
  const key = `otp:${email}`;

  const redisClient = getRedis();

  if (redisClient) {
    await redisClient.del(key);
  } else {
    localStore.delete(key);
  }
};

// =========================================
// Token Blacklist
// =========================================

export const blacklistToken = async (token, ttlSeconds) => {
  const key = `blacklist:${token}`;

  const redisClient = getRedis();

  if (redisClient) {
    await redisClient.setEx(key, ttlSeconds, '1');
  } else {
    localStore.set(key, {
      value: '1',
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
};

export const isTokenBlacklisted = async (token) => {
  const key = `blacklist:${token}`;

  const redisClient = getRedis();

  if (redisClient) {
    const val = await redisClient.get(key);
    return val !== null;
  } else {
    const data = localStore.get(key);

    if (!data) return false;

    if (Date.now() > data.expiresAt) {
      localStore.delete(key);
      return false;
    }

    return true;
  }
};

// =========================================
// Generic Cache
// =========================================

export const cacheSet = async (key, value, ttlSeconds) => {
  const redisClient = getRedis();

  if (redisClient) {
    await redisClient.setEx(
      key,
      ttlSeconds,
      JSON.stringify(value)
    );
  } else {
    localStore.set(key, {
      value: JSON.stringify(value),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
};

export const cacheGet = async (key) => {
  const redisClient = getRedis();

  if (redisClient) {
    const val = await redisClient.get(key);

    return val ? JSON.parse(val) : null;
  } else {
    const data = localStore.get(key);

    if (!data) return null;

    if (Date.now() > data.expiresAt) {
      localStore.delete(key);
      return null;
    }

    return JSON.parse(data.value);
  }
};

export const cacheDel = async (key) => {
  const redisClient = getRedis();

  if (redisClient) {
    await redisClient.del(key);
  } else {
    localStore.delete(key);
  }
};