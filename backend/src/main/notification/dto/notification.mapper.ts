import { Notification } from "../../../entities/notification";
import { NotificationDto } from "./notification.dto";

export class NotificationMapper {
  static fromEntityToDTO(entity: Notification): NotificationDto {
    if (!entity) return undefined;
    const dto = new NotificationDto();
    Object.getOwnPropertyNames(entity).forEach((field) => {
      dto[field] = entity[field];
    });
    return dto;
  }
}
