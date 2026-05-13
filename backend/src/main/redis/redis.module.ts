import { RedisModule } from '@nestjs-modules/ioredis';
import { Module } from '@nestjs/common';
import { RedisController } from './redis.controller';
import { RedisCacheService } from './redis.service';

@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: process.env.REDIS_HOST || 'datn-redis',
        port: Number(process.env.REDIS_PORT || 6379),
        username: process.env.REDIS_USERNAME || undefined,
        password: process.env.REDIS_PASSWORD || undefined,
        db: Number(process.env.REDIS_DB || 0),
      },
    }),
  ],
  controllers: [RedisController],
  providers: [RedisCacheService],
  exports: [RedisCacheService],
})
export class RedisCacheModule {}