import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString
} from "class-validator";
import {
  PIPELINE_RESULT,
  RECRUITMENT_PIPELINE_CODES,
} from "../../../common/constants/recruitment.constants";

@Expose()
export class UpdateCandidateStatusDTO {
  @ApiProperty({
    example: RECRUITMENT_PIPELINE_CODES.HR_SCAN,
    required: true,
    description: "Trạng thái mới của ứng viên (recruitment pipeline code)",
    enum: Object.values(RECRUITMENT_PIPELINE_CODES),
  })
  @IsEnum(RECRUITMENT_PIPELINE_CODES)
  @IsString()
  @IsNotEmpty()
  status: (typeof RECRUITMENT_PIPELINE_CODES)[keyof typeof RECRUITMENT_PIPELINE_CODES];

  @ApiProperty({
    example: PIPELINE_RESULT.PASS,
    required: false,
    description: "Kết quả của trạng thái cũ (PASS, FAIL, PENDING)",
    enum: Object.values(PIPELINE_RESULT),
  })
  @IsEnum(PIPELINE_RESULT)
  @IsOptional()
  previousResult?: (typeof PIPELINE_RESULT)[keyof typeof PIPELINE_RESULT];

  @ApiProperty({
    example: "2025-02-01",
    required: false,
    description: "Ngày onboard dự kiến của ứng viên (chỉ khi status là offer)",
  })
  @IsDateString()
  @IsOptional()
  onboardingDate?: string;

  @ApiProperty({
    example: "Ứng viên có kinh nghiệm tốt, đề xuất chuyển sang vòng phỏng vấn",
    required: false,
    description: "Ghi chú cho trạng thái mới",
  })
  @IsString()
  @IsOptional()
  note?: string;
}
