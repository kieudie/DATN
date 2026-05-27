import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ReviewStatus } from "../../../entities/recruitment-candidate-manager-review";

export class UpdateCandidateReviewStatusDTO {
  @ApiProperty({
    example: ReviewStatus.APPROVE,
    required: true,
    description: "Trạng thái mới của review (PASS, FAIL, PENDING)",
    enum: Object.values(ReviewStatus),
  })
  @IsNotEmpty()
  @IsEnum(ReviewStatus)
  status: ReviewStatus;

  @ApiProperty({
    example: "Good candidate",
    required: false,
    description: "Ghi chú cho review",
  })
  @IsOptional()
  @IsString()
  note?: string;
}
