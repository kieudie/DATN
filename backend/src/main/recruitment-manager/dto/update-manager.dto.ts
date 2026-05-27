import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsBoolean, IsEmail, IsOptional, IsString } from "class-validator";

@Expose()
export class UpdateManagerDTO {
  @ApiProperty({
    example: "Nguyễn Văn A",
    required: false,
    description: "Tên quản lý",
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: "manager@example.com",
    required: false,
    description: "Email quản lý",
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: false,
    required: false,
    description: "Có CC email hay không",
  })
  @IsBoolean()
  @IsOptional()
  isCc?: boolean;

  @ApiProperty({
    example: "Engineering",
    required: false,
    description: "Tên phòng ban",
  })
  @IsString()
  @IsOptional()
  departmentName?: string;
}
