import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class FindAllCandidatesQueryDto {
  @ApiProperty({
    description: "Search by candidate name or email",
    required: false,
    example: "John Doe",
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({
    description: "Search by position (from applications)",
    required: false,
    example: "Backend Developer",
  })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({
    description: "Filter by application status",
    required: false,
    example: "received_cv",
  })
  @IsOptional()
  @IsString()
  status?: string;
}
