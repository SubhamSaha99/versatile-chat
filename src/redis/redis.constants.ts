export function getRedisUrl() {
  const env = process.env.DEV_ENV || 'local';

  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  if (env === 'container') {
    return process.env.REDIS_URL_CONTAINER || 'redis://redis:6379';
  }

  return process.env.REDIS_URL_LOCAL || 'redis://localhost:6379';
}
