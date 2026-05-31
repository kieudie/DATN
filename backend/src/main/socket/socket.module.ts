import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { config } from "../../config/config";
import { Notification } from "../../entities/notification";
import { SocketAuthService } from "./socket-auth.service";
import { SocketController } from "./socket.controller";
import { SocketGateway } from "./socket.gateway";

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    JwtModule.register({
      secret: config["security.jwt.base64-secret"],
      signOptions: { expiresIn: "300s" },
    }),
  ],
  providers: [SocketGateway, SocketAuthService],
  controllers: [SocketController],
  exports: [SocketGateway],
})
export class SocketModule {}
