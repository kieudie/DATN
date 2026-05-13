import { Module } from '@nestjs/common';
import { RolePageController } from './role-page.controller';
import { RolePageService } from './role-page.service';

@Module({
  imports: [],
  controllers: [RolePageController],
  providers: [RolePageService],
  exports: [RolePageService],
})
export class RolePageModule {}