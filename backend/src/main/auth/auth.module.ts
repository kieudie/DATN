import { Module } from '@nestjs/common';
import type { JwtSignOptions } from '@nestjs/jwt';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../../security';
import { RedisCacheModule } from '../redis/redis.module';
import { AuthService } from './auth.service';
import { UserLoginController } from './login.controller';

const jwtExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ||
  '1d') as JwtSignOptions['expiresIn'];

@Module({
  imports: [
    RedisCacheModule,
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'datn_access_secret',
      signOptions: {
        expiresIn: jwtExpiresIn,
      },
    }),
  ],
  controllers: [UserLoginController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}