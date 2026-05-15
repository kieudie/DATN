import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class CandidateApplicationHistoryDTO {
  @ApiProperty({
    example: 1,
    description: "ID của application",
  })
  @Expose()
  applicationId: number;

  @ApiProperty({
    example: "Backend Developer",
    description: "Vị trí ứng tuyển",
  })
  @Expose()
  position: string;

  @ApiProperty({
    example: "Senior",
    description: "Level của vị trí",
  })
  @Expose()
  level: string | null;

  @ApiProperty({
    example: "3.5",
    description: "Điểm GPA của ứng viên",
  })
  @Expose()
  gpa: string | null;

  @ApiProperty({
    example: "Technology",
    description: "Phòng ban",
  })
  @Expose()
  department: string | null;

  @ApiProperty({
    example: "received_cv",
    description: "Trạng thái hiện tại của đơn ứng tuyển",
  })
  @Expose()
  status: string;

  @ApiProperty({
    example: "2026-01-10",
    description: "Ngày ứng tuyển",
  })
  @Expose()
  appliedDate: Date | null;

  @ApiProperty({
    example: "2026-01-10T08:00:00Z",
    description: "Ngày tạo application",
  })
  @Expose()
  createdAt: Date;
}

export class CheckCandidateResponseDTO {
  @ApiProperty({
    example: true,
    description: "Ứng viên có tồn tại trong hệ thống hay không",
  })
  @Expose()
  exists: boolean;

  @ApiProperty({
    example: 1,
    description: "ID của ứng viên (null nếu không tồn tại)",
  })
  @Expose()
  candidateId: number | null;

  @ApiProperty({
    example: "Nguyễn Văn A",
    description: "Họ tên của ứng viên (null nếu không tồn tại)",
  })
  @Expose()
  fullName: string | null;

  @ApiProperty({
    example: "candidate@example.com",
    description: "Email của ứng viên (null nếu không tồn tại)",
  })
  @Expose()
  email: string | null;

  @ApiProperty({
    example: "0987654321",
    description: "Số điện thoại của ứng viên (null nếu không tồn tại)",
  })
  @Expose()
  phone: string | null;

  @ApiProperty({
    example: "Đại học Bách Khoa Hà Nội",
    description: "Trường đại học của ứng viên (null nếu không tồn tại)",
  })
  @Expose()
  universitySchool: string | null;

  @ApiProperty({
    example: "1995-05-15",
    description: "Ngày sinh của ứng viên (null nếu không tồn tại)",
  })
  @Expose()
  birthday: string | null;

  @ApiProperty({
    example: "Nam",
    description: "Giới tính của ứng viên (null nếu không tồn tại)",
  })
  @Expose()
  gender: string | null;

  @ApiProperty({
    type: [CandidateApplicationHistoryDTO],
    description: "Danh sách các vị trí đã ứng tuyển",
  })
  @Expose()
  applications: CandidateApplicationHistoryDTO[];
}
