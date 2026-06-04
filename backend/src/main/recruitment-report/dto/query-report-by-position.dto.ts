import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class QueryReportByPositionDTO {
  @ApiProperty({ description: "Start date (YYYY-MM-DD)", required: false })
  @IsOptional()
  start_date?: string;

  @ApiProperty({ description: "End date (YYYY-MM-DD)", required: false })
  @IsOptional()
  end_date?: string;
}
