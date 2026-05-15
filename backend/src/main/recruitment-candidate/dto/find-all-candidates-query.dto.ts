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
    description:
      "Filter by position name (comma-separated for multiple values)",
    required: false,
    example: "video editor,ua marketing",
  })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({
    description:
      "Filter by application status (comma-separated for multiple values)",
    required: false,
    example: "received_cv,hr_scan",
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: "Filter by department (comma-separated for multiple values)",
    required: false,
    example: "Engineering,Marketing",
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({
    description: "Filter by level (comma-separated for multiple values)",
    required: false,
    example: "Junior,Senior",
  })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiProperty({
    description: "Filter by source (comma-separated for multiple values)",
    required: false,
    example: "LinkedIn,Facebook",
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({
    description:
      "Filter by university/school (comma-separated for multiple values)",
    required: false,
    example: "HCMUT,UEH",
  })
  @IsOptional()
  @IsString()
  universitySchool?: string;

  @ApiProperty({
    description: "Filter by gender (comma-separated for multiple values)",
    required: false,
    example: "female,male",
  })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({
    description: "Filter by pipeline code (comma-separated)",
    required: false,
    example: "technical_test,interview_round_1",
  })
  @IsOptional()
  @IsString()
  pipelineCode?: string;

  @ApiProperty({
    description: "Filter by pipeline result (comma-separated)",
    required: false,
    example: "fail,pass",
  })
  @IsOptional()
  @IsString()
  pipelineResult?: string;

  @ApiProperty({
    description: "Filter by start date (application.appliedDate)",
    required: false,
    example: "2024-01-01",
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({
    description: "Filter by end date (application.appliedDate)",
    required: false,
    example: "2024-12-31",
  })
  @IsOptional()
  @IsString()
  endDate?: string;
}
