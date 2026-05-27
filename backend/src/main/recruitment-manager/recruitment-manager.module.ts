import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RecruitmentCandidateManagerReview } from "src/entities/recruitment-candidate-manager-review";
import { RecruitmentManager } from "../../entities/recruitment-manager";
//import { PersonnelRoleModule } from "../personnel-role/personnel-role.module";
import { RedisCacheModule } from "../redis/redis.module";
//import { SocketModule } from "../socket/socket.module";
import { RecruitmentManagerController } from "./recruitment-manager.controller";
import { RecruitmentManagerService } from "./recruitment-manager.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecruitmentManager,
      RecruitmentCandidateManagerReview,
    ]),
    //PersonnelRoleModule,
    RedisCacheModule,
    //SocketModule,
  ],
  controllers: [RecruitmentManagerController],
  providers: [RecruitmentManagerService],
  exports: [RecruitmentManagerService],
})
export class RecruitmentManagerModule {}
