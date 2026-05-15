import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString
} from "class-validator";
import { TestOnlineStatus } from "../../../common/constants/recruitment.constants";

@Expose()
export class UpdateApplicationDTO {
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
    example: "Senior",
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
    example: "/uploads/cv/nguyenvana_cv_updated.pdf",
    required: false,
    description: "Đường dẫn file CV mới của ứng viên",
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
    example: "Ứng viên có kinh nghiệm 3 năm, phù hợp vị trí",
    required: false,
    description: "Ghi chú về application",
  })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({
    example: "sent",
    required: false,
    description: "Trạng thái test online (sent/passed/not_attempt/failed)",
    enum: TestOnlineStatus,
  })
  @IsEnum(TestOnlineStatus)
  @IsOptional()
  testOnlineStatus?: TestOnlineStatus;
}
