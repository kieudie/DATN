import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class QueryReportOverviewDTO {
  @ApiProperty({ description: "Start date (YYYY-MM-DD)", required: false })
  @IsOptional()
  start_date: string;

  @ApiProperty({ description: "End date (YYYY-MM-DD)", required: false })
  @IsOptional()
  end_date: string;

  @ApiProperty({ description: "Filter by position", required: false })
  @IsOptional()
  position: string;

  @ApiProperty({ description: "Filter by level", required: false })
  @IsOptional()
  level: string;

  @ApiProperty({ description: "Filter by department", required: false })
  @IsOptional()
  department: string;
}
