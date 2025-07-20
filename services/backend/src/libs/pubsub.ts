import Redis from 'ioredis';

export const sub = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
export const pub = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379'); 