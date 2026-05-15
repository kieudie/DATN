import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

@Expose()
export class BulkImportResultDTO {
  @ApiProperty({
    example: 100,
    description: "Tổng số records trong file CSV",
  })
  totalRecords: number;

  @ApiProperty({
    example: 95,
    description: "Số lượng candidates đã import thành công",
  })
  successCount: number;

  @ApiProperty({
    example: 5,
    description: "Số lượng records bị lỗi hoặc skip",
  })
  failedCount: number;

  @ApiProperty({
    example: [
      {
        row: 10,
        email: "test@example.com",
        error: "Email already exists",
      },
    ],
    description: "Danh sách các records bị lỗi",
  })
  errors: Array<{
    row: number;
    email?: string;
    fullName?: string;
    error: string;
  }>;
}
