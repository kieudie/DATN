import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { LoggerService } from "../../common/logger/logger.service";
import { Notification } from "../../entities/notification";
import { NotificationSubUser } from "../../entities/notification_sub_user";
import { SaveSubDto } from "./dto/notification.dto";
import { NotificationMapper } from "./dto/notification.mapper";

@Injectable()
export class NotificationService {
  private readonly logger = new LoggerService("NotificationService");

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationSubUser)
    private readonly notificationSubUserRepository: Repository<NotificationSubUser>,
  ) {}

  async findByPersonnelCode(personnelCode: number) {
    const data = await this.notificationRepository.find({
      where: {
        personnelCode,
        deletedAt: IsNull(),
      },
      order: { createdAt: "DESC" },
    });

    return data.map((n) => NotificationMapper.fromEntityToDTO(n));
  }

  async markAsRead(id: number, personnelCode: number) {
    const noti = await this.notificationRepository.findOne({
      where: { id, personnelCode, deletedAt: IsNull() },
    });
    if (!noti) return { ok: false, message: "Notification not found" };

    noti.isRead = 1;
    noti.updatedAt = new Date();
    await this.notificationRepository.save(noti);
    return { ok: true };
  }

  async markAllAsRead(personnelCode: number) {
    await this.notificationRepository.update(
      { personnelCode, isRead: 0, deletedAt: IsNull() },
      { isRead: 1, updatedAt: new Date() },
    );
    return { ok: true };
  }

  async saveSubscription(personnelCode: number, dto: SaveSubDto) {
    // Upsert by endpoint: update if exists, create otherwise
    let sub = await this.notificationSubUserRepository.findOne({
      where: { endPoint: dto.endpoint as any, deletedAt: IsNull() },
    });

    if (sub) {
      sub.personnelCode = personnelCode;
      sub.expirationTime = dto.expirationTime ?? null;
      sub.p256dh = dto.keys.p256dh as any;
      sub.auth = dto.keys.auth as any;
      sub.updatedAt = new Date();
    } else {
      sub = this.notificationSubUserRepository.create({
        personnelCode,
        endPoint: dto.endpoint as any,
        expirationTime: dto.expirationTime ?? null,
        p256dh: dto.keys.p256dh as any,
        auth: dto.keys.auth as any,
      });
    }

    await this.notificationSubUserRepository.save(sub);
    return { ok: true };
  }
}
