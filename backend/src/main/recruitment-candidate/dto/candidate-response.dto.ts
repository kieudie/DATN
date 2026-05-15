import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { ApplicationResponseDTO } from "./application-response.dto";

@Expose()
export class CandidateResponseDTO {
  @ApiProperty({ example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ example: "Nguyễn Văn A" })
  @Expose({ name: "full_name" })
  fullName: string | null;

  @ApiProperty({ example: "0987654321" })
  @Expose({ name: "phone" })
  phone: string | null;

  @ApiProperty({ example: "nguyenvana@example.com" })
  @Expose({ name: "email" })
  email: string;

  @ApiProperty({ example: "Nam" })
  @Expose({ name: "gender" })
  gender: string | null;

  @ApiProperty({ example: "Đại học Bách Khoa" })
  @Expose({ name: "university_school" })
  universitySchool: string | null;

  @ApiProperty({ example: "2025-12-25T10:00:00.000Z" })
  @Expose({ name: "created_at" })
  createdAt: Date;

  @ApiProperty({ example: "2025-12-25T10:00:00.000Z" })
  @Expose({ name: "updated_at" })
  updatedAt: Date;

  @ApiProperty({ example: null })
  @Expose({ name: "deleted_at" })
  deletedAt: Date | null;

  @ApiProperty({
    type: [ApplicationResponseDTO],
    description: "List of all applications submitted by this candidate",
  })
  @Type(() => ApplicationResponseDTO)
  @Expose()
  applications?: ApplicationResponseDTO[];
}
