import { ApiProperty } from "@nestjs/swagger";

/**
 * A header base object.
 */
export class BaseHeaderDTO {
  @ApiProperty({
    example: "1",
    description: "page",
    required: false,
  })
  page: string;

  @ApiProperty({
    example: "20",
    description: "size",
    required: false,
  })
  size: string;

  @ApiProperty({
    example: "nameUser",
    description: "field sort",
    required: false,
  })
  active: string;

  @ApiProperty({
    example: "ASC",
    description: "value sort DESC or ASC",
    required: false,
  })
  direction: string;
}
