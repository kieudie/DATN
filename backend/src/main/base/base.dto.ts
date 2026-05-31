import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional } from "class-validator";

/**
 * A DTO base object.
 */
export class BaseDTO {
  @ApiProperty({
    description: "id",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  id?: number;

  // created_by?: string;

  // created_date?: Date;

  // last_modified_by?: string;

  // last_modified_date?: Date;
}
