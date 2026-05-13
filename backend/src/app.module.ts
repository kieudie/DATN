import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerModule } from './common/logger/logger.module';


import { AuthModule } from './main/auth/auth.module';
import { PersonnelsModule } from './main/personnels/personnels.module';
import { RedisCacheModule } from './main/redis/redis.module';
import { RolePageModule } from './main/role-page/role-page.module';
import { RolesModule } from './main/roles/roles.module';
import { UsersModule } from './main/users/users.module';

import { RecruitmentModule } from './main/recruitment-candidate/recruitment.module';
import { RecruitmentOrderModule } from './main/recruitment-order/recruitment-order.module';
import { ormConfig } from './typeorm/orm.config';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(ormConfig()),
    LoggerModule,
    AuthModule,
    PersonnelsModule,
    RedisCacheModule,
    RolePageModule,
    RolesModule,
    UsersModule,
    RecruitmentModule,
    RecruitmentOrderModule,
  ],
})
export class AppModule {}