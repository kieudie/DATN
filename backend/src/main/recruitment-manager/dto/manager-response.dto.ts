import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class ManagerPermissionDTO {
  @ApiProperty({ example: "view" })
  scope: string;

  @ApiProperty({ example: "Backend Development" })
  specialization: string;
}

@Expose()
export class ManagerResponseDTO {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "Nguyễn Văn A" })
  name: string;

  @ApiProperty({ example: "manager@example.com" })
  email: string;

  @ApiProperty({ example: false })
  isCc: boolean;

  @ApiProperty({ example: "Engineering" })
  departmentName: string;

  @ApiProperty({ example: "Backend Development", required: false })
  specialization?: string;

  @ApiProperty({ example: "Tester_1", required: false })
  isTechlead?: string;

  @ApiProperty({ type: [ManagerPermissionDTO] })
  permissions: ManagerPermissionDTO[];
}
