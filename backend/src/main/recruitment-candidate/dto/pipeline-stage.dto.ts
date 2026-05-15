import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class PipelineStageDTO {
  @ApiProperty({ example: 1, description: "Pipeline stage ID" })
  @Expose()
  id: number;

  @ApiProperty({ example: "Received CV", description: "Pipeline stage name" })
  @Expose()
  name: string;

  @ApiProperty({ example: "received_cv", description: "Pipeline stage code" })
  @Expose()
  code: string;

  @ApiProperty({ example: 1, description: "Display order" })
  @Expose()
  order: number;

  @ApiProperty({
    example: 1,
    description: "Active status (1=active, 0=inactive)",
  })
  @Expose()
  isActive: number;
}
