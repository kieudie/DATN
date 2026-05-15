import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class CandidateInGroupDTO {
  @ApiProperty({ example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ example: 1 })
  @Expose()
  candidateId: number;

  @ApiProperty({ example: "Nguyễn Văn A" })
  @Expose()
  fullName: string;

  @ApiProperty({ example: "0987654321" })
  @Expose()
  phone: string;

  @ApiProperty({ example: "candidate@example.com" })
  @Expose()
  email: string;

  @ApiProperty({ example: "Nam" })
  @Expose()
  gender: string | null;

  @ApiProperty({ example: "Đại học Bách Khoa" })
  @Expose()
  universitySchool: string | null;

  @ApiProperty({ example: "Backend Developer" })
  @Expose()
  position: string | null;

  @ApiProperty({ example: "Senior" })
  @Expose()
  level: string | null;

  @ApiProperty({ example: "IT Department" })
  @Expose()
  department: string | null;

  @ApiProperty({ example: "LinkedIn" })
  @Expose()
  source: string | null;

  @ApiProperty({ example: "2026-01-01" })
  @Expose()
  appliedDate: Date | null;

  @ApiProperty({ example: "Good candidate" })
  @Expose()
  note: string | null;

  @ApiProperty({ example: "2026-01-01T00:00:00.000Z" })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: "2026-01-03T00:00:00.000Z" })
  @Expose()
  updatedAt: Date;
}

export class GroupedByStatusDTO {
  @ApiProperty({ example: "received_cv" })
  @Expose()
  status: string;

  @ApiProperty({ example: "CV Đã Nhận" })
  @Expose()
  statusName: string;

  @ApiProperty({ example: 1 })
  @Expose()
  displayOrder: number;

  @ApiProperty({ example: 15 })
  @Expose()
  count: number;

  @ApiProperty({ type: [CandidateInGroupDTO] })
  @Expose()
  candidates: CandidateInGroupDTO[];
}

export class GroupedCandidatesResponseDTO {
  @ApiProperty({
    example: "Candidates grouped by status retrieved successfully",
  })
  @Expose()
  message: string;

  @ApiProperty({ type: [GroupedByStatusDTO] })
  @Expose()
  data: GroupedByStatusDTO[];

  @ApiProperty({ example: 45 })
  @Expose()
  totalCandidates: number;
}
