import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { BaseDTO } from "../../base/base.dto";

export class SubKeysDto {
  @ApiProperty({ example: "BE0Yjcv..." })
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @ApiProperty({ example: "uVrPw1LL..." })
  @IsString()
  @IsNotEmpty()
  auth: string;
}

export class SaveSubDto {
  @ApiProperty({ example: "https://fcm.googleapis.com/fcm/send/..." })
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ApiProperty({ required: false, nullable: true })
  @IsNumber()
  @IsOptional()
  expirationTime?: number | null;

  @ApiProperty({ type: SubKeysDto })
  @ValidateNested()
  @Type(() => SubKeysDto)
  @IsNotEmpty()
  keys: SubKeysDto;
}

@Expose()
export class NotificationDto extends BaseDTO {
  @ApiProperty() mainNotiId: number | null;
  @ApiProperty() personnelCode: number;
  @ApiProperty() title: string;
  @ApiProperty() body: string;
  @ApiProperty() isSend: number | null;
  @ApiProperty() isRead: number | null;
  @ApiProperty() date: string | null;
  @ApiProperty() createdAt: Date | null;
  @ApiProperty() updatedAt: Date | null;
}
