import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class CheckCandidateDTO {
  @ApiProperty({
    example: "candidate@example.com",
    required: false,
    description: "Email của ứng viên cần kiểm tra",
  })
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: "0987654321",
    required: false,
    description: "Số điện thoại của ứng viên cần kiểm tra",
  })
  @IsOptional()
  phone?: string;
}
