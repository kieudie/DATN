import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsOptional } from "class-validator";

export class FindAllCandidatesByManagerQueryDTO {
  @ApiProperty({
    example: "example@example.com",
    required: false,
    description: "Email của manager",
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: "Engineering",
    required: false,
    description: "Tên phòng ban của manager",
  })
  @IsOptional()
  departmentName?: string;
}
