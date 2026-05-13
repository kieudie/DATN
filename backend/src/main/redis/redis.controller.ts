import { Controller, Delete, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RedisCacheService } from './redis.service';

@Controller('api/redis')
@ApiTags('Redis')
export class RedisController {
  constructor(private readonly redisService: RedisCacheService) {}

  @Get()
  async findAll() {
    const key = 'abc';
    const value = '123';
    const ttlSeconds = 300;

    await this.redisService.cacheData(key, value, ttlSeconds);

    return {
      message: 'Cached successfully',
      key,
      value,
      ttl_seconds: ttlSeconds,
    };
  }

  @Get(':key')
  async findOne(@Param('key') key: string) {
    const value = await this.redisService.getCachedData(key);

    return {
      key,
      value,
      found: value !== null,
    };
  }

  @Delete(':key')
  async deleteOne(@Param('key') key: string) {
    await this.redisService.delCache(key);

    return {
      message: 'Deleted successfully',
      key,
    };
  }
}