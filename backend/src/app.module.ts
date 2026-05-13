import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerModule } from './common/logger/logger.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './main/auth/auth.module';
import { PersonnelsModule } from './main/personnels/personnels.module';
import { RedisCacheModule } from './main/redis/redis.module';
import { RolePageModule } from './main/role-page/role-page.module';
import { RolesModule } from './main/roles/roles.module';
import { UsersModule } from './main/users/users.module';

import { ormConfig } from './typeorm/orm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot(ormConfig()),

    LoggerModule,
    RedisCacheModule,

    AuthModule,
    UsersModule,
    RolesModule,
    RolePageModule,
    PersonnelsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}