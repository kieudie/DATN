import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString
} from "class-validator";

@Expose()
export class CreateCandidateDTO {
  @ApiProperty({
    example: "Nguyễn Văn A",
    required: false,
    description: "Họ và tên ứng viên",
  })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({
    example: "0987654321",
    required: false,
    description: "Số điện thoại ứng viên",
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: "nguyenvana@example.com",
    required: true,
    description: "Email ứng viên (bắt buộc và duy nhất)",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: "Nam",
    required: false,
    description: "Giới tính ứng viên (Nam/Nữ/Khác)",
  })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({
    example: "Đại học Bách Khoa",
    required: false,
    description: "Trường đại học của ứng viên",
  })
  @IsString()
  @IsOptional()
  universitySchool?: string;

  @ApiProperty({
    example: "1995-05-15",
    required: false,
    description: "Ngày sinh của ứng viên",
  })
  @IsString()
  @IsOptional()
  birthday?: string;

  @ApiProperty({
    example: "2025-12-25",
    required: false,
    description: "Ngày nộp đơn ứng tuyển",
  })
  @IsDateString()
  @IsOptional()
  appliedDate?: string;

  @ApiProperty({
    example: "Backend Developer",
    required: false,
    description: "Vị trí ứng tuyển",
  })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiProperty({
    example: "Junior",
    required: false,
    description: "Cấp độ (Junior/Middle/Senior)",
  })
  @IsString()
  @IsOptional()
  level?: string;

  @ApiProperty({
    example: "Engineering",
    required: false,
    description: "Phòng ban ứng tuyển",
  })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({
    example: "LinkedIn",
    required: false,
    description: "Nguồn tuyển dụng (LinkedIn, Facebook, Website, etc.)",
  })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiProperty({
    example: "received_cv",
    required: true,
    description: "Trạng thái ứng viên",
  })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({
    example: "/uploads/cv/nguyenvana_cv.pdf",
    required: false,
    description: "Đường dẫn file CV của ứng viên",
  })
  @IsString()
  @IsOptional()
  filePath?: string;

  @ApiProperty({
    example: "https://github.com/user/project1, https://product-demo.com",
    required: false,
    description:
      "Danh sách link sản phẩm của ứng viên (cách nhau bởi dấu phẩy)",
  })
  @IsString()
  @IsOptional()
  productLinks?: string;

  @ApiProperty({
    example: "Pass",
    required: false,
    description: "Kết quả bài test IQ",
  })
  @IsString()
  @IsOptional()
  iqTest?: string;

  @ApiProperty({
    example: "Good",
    required: false,
    description: "Kết quả bài test kỹ thuật",
  })
  @IsString()
  @IsOptional()
  techTest?: string;

  @ApiProperty({
    example: "Excellent",
    required: false,
    description: "Kết quả bài test tư duy",
  })
  @IsString()
  @IsOptional()
  thinkingTest?: string;

  @ApiProperty({
    example: "3.5",
    required: false,
    description: "Điểm GPA của ứng viên",
  })
  @IsString()
  @IsOptional()
  gpa?: string;

  @ApiProperty({
    example: "Ứng viên tiềm năng, cần follow up",
    required: false,
    description: "Ghi chú về application",
  })
  @IsString()
  @IsOptional()
  note?: string;
}
