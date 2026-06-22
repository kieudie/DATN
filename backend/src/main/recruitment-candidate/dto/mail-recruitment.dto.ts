import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { RECRUITMENT_PIPELINE_CODES } from "src/common/constants/recruitment.constants";

@Expose()
export class MailRecruitmentDTO {
  @ApiProperty({
    example: "2026-01-15T08:00:00Z",
    required: false,
    description:
      "Thời gian thực hiện gửi email (ISO 8601 format). Nếu không có, email sẽ được gửi ngay lập tức.",
  })
  @IsDateString()
  @IsOptional()
  execute_at?: string;

  @ApiProperty({
    example: ["hr@rocketstudio.game"],
    required: false,
    description: "Địa chỉ email CC (Carbon Copy) cho email tuyển dụng.",
  })
  @IsOptional()
  cc?: string | string[];

  @ApiProperty({
    example: RECRUITMENT_PIPELINE_CODES.HR_SCAN,
    required: true,
    description: "Trạng thái mới của ứng viên (recruitment pipeline code)",
    enum: Object.values(RECRUITMENT_PIPELINE_CODES),
  })
  @IsEnum(RECRUITMENT_PIPELINE_CODES)
  @IsString()
  @IsNotEmpty()
  status: (typeof RECRUITMENT_PIPELINE_CODES)[keyof typeof RECRUITMENT_PIPELINE_CODES];

  @ApiProperty({
    example: "IQ Test",
    required: false,
    description: "Loại bài test được gửi (ví dụ: 'IQ Test', 'Technical Test')",
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({
    example: "https://iq-test.rocketstudio.game/candidate/abc123",
    required: false,
    description: "Link bài test IQ hoặc test online",
  })
  @IsString()
  @IsOptional()
  testLink?: string;

  @ApiProperty({
    example: "3 ngày kể từ khi nhận email",
    required: false,
    description: "Thời hạn hoàn thành bài test",
  })
  @IsString()
  @IsOptional()
  deadline?: string;

  @ApiProperty({
    example: "Vui lòng hoàn thành bài test trong thời gian quy định",
    required: false,
    description: "Ghi chú thứ nhất cho ứng viên",
  })
  @IsString()
  @IsOptional()
  note1?: string;

  @ApiProperty({
    example: "Kết quả sẽ được gửi qua email sau khi hoàn tất",
    required: false,
    description: "Ghi chú thứ hai cho ứng viên",
  })
  @IsString()
  @IsOptional()
  note2?: string;

  @ApiProperty({
    example:
      "Tầng 8, tòa nhà Gold Tower, số 275 Nguyễn Trãi, Phường Khương Đình, TP. Hà Nội",
    required: false,
    description: "Địa chỉ phỏng vấn hoặc làm bài test",
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    example: "Thứ Tư, ngày 17/01/2026, lúc 10:00",
    required: false,
    description: "Ngày giờ phỏng vấn",
  })
  @IsString()
  @IsOptional()
  interviewDate?: string;

  @ApiProperty({
    example: "Ms. Linh - HR Department - SĐT: (+84) 984578828",
    required: false,
    description: "Thông tin người liên hệ",
  })
  @IsString()
  @IsOptional()
  contact?: string;

  @ApiProperty({
    example: "Vui lòng mang theo CMND/CCCD và đến trước giờ hẹn 15 phút",
    required: false,
    description: "Ghi chú chung cho ứng viên",
  })
  @IsString()
  @IsOptional()
  note3?: string;

  @ApiProperty({
    example: "https://maps.app.goo.gl/xyz123",
    required: false,
    description: "Link Google Maps đến địa điểm phỏng vấn/test",
  })
  @IsString()
  @IsOptional()
  mapLink?: string;

  @ApiProperty({
    example: "Thứ Hai, ngày 15/01/2026, lúc 14:00",
    required: false,
    description: "Ngày giờ làm bài test kỹ thuật",
  })
  @IsString()
  @IsOptional()
  testDate?: string;

  @ApiProperty({
    example: "Thứ Hai, ngày 20/01/2026",
    required: false,
    description: "Ngày nhận việc (dùng cho email offer)",
  })
  @IsString()
  @IsOptional()
  offerDate?: string;

  @ApiProperty({
    type: "array",
    items: {
      type: "string",
      format: "binary",
    },
    required: false,
    description: "Danh sách file đính kèm trong email (upload files)",
  })
  @IsOptional()
  attachments?: any[];
}
