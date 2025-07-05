import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { config } from './index';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const IS_DEV = config.nodeEnv === 'development';

/**
 * 簡單的內存緩存實現，用於開發環境中沒有 Redis 的情況
 */
class MemoryCache {
  private cache: Map<string, { value: string; expiry: number | null }>;

  constructor() {
    this.cache = new Map();
    logger.info('使用記憶體緩存作為 Redis 替代');
  }

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // 檢查是否過期
    if (item.expiry !== null && item.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.cache.set(key, { value, expiry: null });
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    const expiry = Date.now() + seconds * 1000;
    this.cache.set(key, { value, expiry });
    return 'OK';
  }

  async quit(): Promise<'OK'> {
    this.cache.clear();
    return 'OK';
  }

  on(event: string, callback: (...args: any[]) => void): this {
    if (event === 'connect') {
      // 立即觸發連接事件
      setTimeout(callback, 0);
    }
    return this;
  }
}

// 創建 Redis 客戶端或記憶體緩存
let client: Redis | MemoryCache;

// 在開發環境中，嘗試連接 Redis，如果失敗則使用內存緩存
try {
  if (IS_DEV) {
    client = new MemoryCache() as unknown as Redis;
  } else {
    client = new Redis(REDIS_URL);
    
    // 監聽連接事件
    client.on('connect', () => {
      logger.info('成功連接到 Redis 伺服器');
    });

    // 監聽錯誤事件
    client.on('error', (error) => {
      logger.error('Redis 連接錯誤', { error });
    });
  }
} catch (error) {
  logger.warn('無法連接到 Redis, 使用記憶體緩存替代', { error });
  client = new MemoryCache() as unknown as Redis;
}

export const redisClient = client;

/**
 * 關閉 Redis 連接
 */
export async function closeRedisConnection(): Promise<void> {
  try {
    await redisClient.quit();
    logger.info('Redis 連接已關閉');
  } catch (error) {
    logger.error('關閉 Redis 連接時發生錯誤', { error });
  }
}