import Redis from 'ioredis';
import { logger } from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const client = new Redis(REDIS_URL);

client.on('connect', () => {
  logger.info('Redis 連接成功');
});

client.on('error', (error) => {
  logger.error('Redis 連接錯誤', { error });
});

export const redisClient = client;

export async function closeRedisConnection(): Promise<void> {
  try {
    await redisClient.quit();
    logger.info('Redis 連接已關閉');
  } catch (error) {
    logger.error('關閉 Redis 連接時發生錯誤', { error });
  }
}