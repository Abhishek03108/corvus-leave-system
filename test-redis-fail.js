// Force NODE_ENV to production to test the hard failure
process.env.NODE_ENV = 'production';
process.env.REDIS_HOST = 'invalid.local';
process.env.REDIS_PORT = '9999';

console.log('--- Staging Redis Hard-Failure Test ---');
console.log('Expecting the application to FATAL ERROR and exit since Redis is down in production.');

import { connectRedis } from './src/config/redis.js';

const testRedis = async () => {
  try {
    await connectRedis();
    console.error('❌ ERROR: Redis connection succeeded or fell back to memory in production mode. This is a failure.');
    process.exit(1);
  } catch (error) {
    // If we reach here, the process didn't exit internally which means our hard-failure logic might be wrong
    console.error('❌ ERROR: Redis threw an error but process did not exit internally:', error);
  }
};

testRedis();
