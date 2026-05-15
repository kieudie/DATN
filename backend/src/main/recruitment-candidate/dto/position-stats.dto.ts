import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class PositionStatsDTO {
  @ApiProperty({ example: "Backend Developer" })
  @Expose()
  position: string;

  @ApiProperty({ example: 25, description: "Number of CVs for this position" })
  @Expose()
  count: number;
}

export class PositionStatsResponseDTO {
  @ApiProperty({ example: "Position statistics retrieved successfully" })
  @Expose()
  message: string;

  @ApiProperty({ type: [PositionStatsDTO] })
  @Expose()
  data: PositionStatsDTO[];

  @ApiProperty({ example: 150, description: "Total number of applications" })
  @Expose()
  totalApplications: number;
}
