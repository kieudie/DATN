import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";
import { ReviewStatus } from "../../../entities/recruitment-candidate-manager-review";

export class CreateCandidateReviewDTO {
  @IsNotEmpty()
  @IsNumber()
  application_id: number;

  @IsNotEmpty()
  @IsString()
  pipeline_code: string;

  @IsNotEmpty()
  @IsEnum(ReviewStatus)
  status: ReviewStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
