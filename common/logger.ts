import chalk from 'chalk';
import Redis from 'ioredis';
import { LOG_CHANNEL } from './constants';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

export function initLogger(service: string, color: keyof typeof chalk, publish = true) {
  const colorFn = (chalk as any)[color] ?? chalk.white;
  const original = console.log;
  console.log = (...args: any[]) => {
    const msg = args.map(String).join(' ');
    original(colorFn(`[${service}] ${msg}`));
    if (publish) {
      redis.publish(LOG_CHANNEL, JSON.stringify({ service, msg, ts: Date.now() }));
    }
  };
} 