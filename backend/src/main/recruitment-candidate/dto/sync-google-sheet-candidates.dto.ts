import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional } from "class-validator";

export class SyncGoogleSheetCandidatesDto {
  @ApiPropertyOptional({
    description: "Recruitment order ID dùng để đưa ứng viên vào order tương ứng",
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orderId?: number;
}