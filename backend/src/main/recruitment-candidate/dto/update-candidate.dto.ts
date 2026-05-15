import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsEmail, IsOptional, IsString } from "class-validator";

@Expose()
export class UpdateCandidateDTO {
  @ApiProperty({
    example: "Nguyễn Văn A",
    required: false,
    description: "Họ và tên ứng viên",
  })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({
    example: "0987654321",
    required: false,
    description: "Số điện thoại ứng viên",
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: "nguyenvana@example.com",
    required: false,
    description: "Email ứng viên",
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: "Nam",
    required: false,
    description: "Giới tính ứng viên (Nam/Nữ/Khác)",
  })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({
    example: "Đại học Bách Khoa",
    required: false,
    description: "Trường đại học của ứng viên",
  })
  @IsString()
  @IsOptional()
  universitySchool?: string;

  @ApiProperty({
    example: "1995-05-15",
    required: false,
    description: "Ngày sinh của ứng viên",
  })
  @IsString()
  @IsOptional()
  birthday?: string;
}
