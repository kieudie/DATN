import { Module } from '@nestjs/common';
import { RolePageModule } from '../role-page/role-page.module';
import { PersonnelsController } from './personnels.controller';
import { PersonnelsService } from './personnels.service';

@Module({
  imports: [RolePageModule],
  controllers: [PersonnelsController],
  providers: [PersonnelsService],
  exports: [PersonnelsService],
})
export class PersonnelsModule {}