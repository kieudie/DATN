import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

@Expose()
export class CreatorInfoDTO {
  @ApiProperty({ example: 12345 })
  @Expose({ name: "personnel_code" })
  personnelCode: number;

  @ApiProperty({ example: "Nguyễn Văn B" })
  @Expose({ name: "personnel_name" })
  personnelName: string | null;
}

@Expose()
export class CvResponseDTO {
  @ApiProperty({ example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ example: 1 })
  @Expose({ name: "candidate_id" })
  candidateId: number;

  @ApiProperty({ example: 1 })
  @Expose({ name: "application_id" })
  applicationId: number;

  @ApiProperty({ example: "/uploads/cv/nguyenvana_cv.pdf" })
  @Expose({ name: "file_path" })
  filePath: string;

  @ApiProperty({ example: "2025-12-25T10:00:00.000Z" })
  @Expose({ name: "created_at" })
  createdAt: Date;
}

@Expose()
export class PipelineHistoryResponseDTO {
  @ApiProperty({ example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ example: 1 })
  @Expose({ name: "candidate_id" })
  candidateId: number;

  @ApiProperty({ example: 1 })
  @Expose({ name: "application_id" })
  applicationId: number;

  @ApiProperty({ example: "screening" })
  @Expose({ name: "recruitment_pipeline_code" })
  recruitmentPipelineCode: string;

  @ApiProperty({ example: "2025-12-25T10:00:00.000Z" })
  @Expose({ name: "start_time" })
  startTime: Date;

  @ApiProperty({ example: "2025-12-25T11:00:00.000Z", required: false })
  @Expose({ name: "end_time" })
  endTime: Date | null;

  @ApiProperty({ example: "pending", enum: ["pass", "fail", "pending"] })
  @Expose({ name: "result" })
  result: "pass" | "fail" | "pending";

  @ApiProperty({ example: "Candidate shows great potential", required: false })
  @Expose({ name: "note" })
  note: string | null;

  @ApiProperty({ example: 1, required: false })
  @Expose({ name: "created_by" })
  createdBy: number | null;

  @ApiProperty({ type: CreatorInfoDTO, required: false })
  @Type(() => CreatorInfoDTO)
  @Expose()
  creator: CreatorInfoDTO | null;

  @ApiProperty({ example: "2025-12-25T10:00:00.000Z" })
  @Expose({ name: "created_at" })
  createdAt: Date;
}

@Expose()
export class CandidateBasicInfoDTO {
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

  @ApiProperty({ example: "Đại học Bách Khoa" })
  @Expose({ name: "university_school" })
  universitySchool: string | null;

  @ApiProperty({ example: "2025-12-25T10:00:00.000Z" })
  @Expose({ name: "created_at" })
  createdAt: Date;

  @ApiProperty({ example: "2025-12-25T10:00:00.000Z" })
  @Expose({ name: "updated_at" })
  updatedAt: Date;
}

@Expose()
export class ApplicationResponseDTO {
  @ApiProperty({ example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ example: 1 })
  @Expose({ name: "candidate_id" })
  candidateId: number;

  @ApiProperty({ example: "Backend Developer" })
  @Expose({ name: "position" })
  position: string | null;

  @ApiProperty({ example: "Junior" })
  @Expose({ name: "level" })
  level: string | null;

  @ApiProperty({ example: "Engineering" })
  @Expose({ name: "department" })
  department: string | null;

  @ApiProperty({ example: "LinkedIn" })
  @Expose({ name: "source" })
  source: string | null;

  @ApiProperty({ example: "2025-12-25" })
  @Expose({ name: "applied_date" })
  appliedDate: Date | null;

  @ApiProperty({ example: "pending" })
  @Expose({ name: "status" })
  status: string;

  @ApiProperty({ example: "Pass", required: false })
  @Expose({ name: "iq_test" })
  iqTest: string | null;

  @ApiProperty({ example: "Good", required: false })
  @Expose({ name: "tech_test" })
  techTest: string | null;

  @ApiProperty({ example: "Excellent", required: false })
  @Expose({ name: "thinking_test" })
  thinkingTest: string | null;

  @ApiProperty({ example: "2025-02-01", required: false })
  @Expose({ name: "onboarding_date" })
  onboardingDate: Date | null;

  @ApiProperty({
    example: "Ứng viên có kinh nghiệm 3 năm, phù hợp vị trí",
    required: false,
  })
  @Expose({ name: "note" })
  note: string | null;

  @ApiProperty({ example: "2025-12-25T10:00:00.000Z" })
  @Expose({ name: "created_at" })
  createdAt: Date;

  @ApiProperty({ example: "2025-12-25T10:00:00.000Z" })
  @Expose({ name: "updated_at" })
  updatedAt: Date;

  @ApiProperty({ type: CandidateBasicInfoDTO })
  @Type(() => CandidateBasicInfoDTO)
  @Expose()
  candidate: CandidateBasicInfoDTO;

  @ApiProperty({ type: [CvResponseDTO] })
  @Type(() => CvResponseDTO)
  @Expose()
  cvs: CvResponseDTO[];

  @ApiProperty({ type: [PipelineHistoryResponseDTO] })
  @Type(() => PipelineHistoryResponseDTO)
  @Expose({ name: "pipelineHistory" })
  pipelineHistory: PipelineHistoryResponseDTO[];
}
