import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import { LoggerService } from '../../common/logger/logger.service';

@Injectable()
export class RedisCacheService {
  private readonly logger = new LoggerService();

  constructor(@InjectRedis() private readonly redis: Redis) {
  }

  async getCachedData<T = any>(key: string): Promise<T | string | null> {
    try {
      const value = await this.redis.get(key);

      if (value === null) {
        return null;
      }

      try {
        return JSON.parse(value) as T;
      } catch {
        return value;
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async cacheData(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const data =
        typeof value === 'string' ? value : JSON.stringify(value);

      if (ttl) {
        await this.redis.set(key, data, 'EX', ttl);
        return;
      }

      await this.redis.set(key, data);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delCache(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async flushDb(): Promise<void> {
    try {
      await this.redis.flushdb();
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  generateCacheKey({
    path,
    apiName,
    keyName,
  }: {
    path: string;
    apiName: string;
    keyName: string;
  }): string {
    const prefix = process.env.REDIS_CACHE_KEY_NAME || 'datn_recruitment';

    return `${prefix}:${path}:${apiName}:${keyName}`;
  }

  async setBlacklistedToken(
    token: string,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      const key = this.generateBlacklistedTokenKey(token);

      await this.redis.set(key, '1', 'EX', ttlSeconds);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async isBlacklistedToken(token: string): Promise<boolean> {
    try {
      const key = this.generateBlacklistedTokenKey(token);
      const value = await this.redis.get(key);

      return value === '1';
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private generateBlacklistedTokenKey(token: string): string {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    return `blacklisted:${tokenHash}`;
  }
}