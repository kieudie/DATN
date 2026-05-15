import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  PIPELINE_RESULT,
  RECRUITMENT_PIPELINE_CODES,
} from "../../../common/constants/recruitment.constants";
import { LoggerService } from "../../../common/logger/logger.service";
import { RecruitmentCandidatePipeline } from "../../../entities/recruitment-candidate-pipeline";

@Injectable()
export class CandidatePipelineService {
private readonly logger = new LoggerService();

constructor(
  @InjectRepository(RecruitmentCandidatePipeline)
  private pipelineRepository: Repository<RecruitmentCandidatePipeline>,
) {
  this.logger.setContext('CandidatePipelineService');
}
  /**
   * Create new pipeline history record
   */
  async create(data: {
    candidateId: number;
    applicationId: number;
    recruitmentPipelineCode: string;
    startTime?: Date;
    endTime?: Date | null;
    result?: "pass" | "fail" | "pending";
    note?: string;
    createdBy?: number;
  }): Promise<RecruitmentCandidatePipeline> {
    const pipeline = this.pipelineRepository.create({
      candidateId: data.candidateId,
      applicationId: data.applicationId,
      recruitmentPipelineCode: data.recruitmentPipelineCode,
      startTime: data.startTime || new Date(),
      endTime: data.endTime || null,
      result: data.result || (PIPELINE_RESULT.PENDING as "pending"),
      note: data.note || null,
      createdBy: data.createdBy || null,
    });
    const saved = await this.pipelineRepository.save(pipeline);
    this.logger.log(
      `Created pipeline history for application: ${data.applicationId}`
    );
    return saved;
  }

  /**
   * Create pipeline entity (without saving)
   */
  createEntity(data: {
    candidateId: number;
    applicationId: number;
    recruitmentPipelineCode: string;
    startTime?: Date;
    endTime?: Date | null;
    result?: "pass" | "fail" | "pending";
    note?: string;
    createdBy?: number;
  }): RecruitmentCandidatePipeline {
    return this.pipelineRepository.create({
      candidateId: data.candidateId,
      applicationId: data.applicationId,
      recruitmentPipelineCode: data.recruitmentPipelineCode,
      startTime: data.startTime || new Date(),
      endTime: data.endTime || null,
      result: data.result || (PIPELINE_RESULT.PENDING as "pending"),
      note: data.note || null,
      createdBy: data.createdBy || null,
    });
  }

  /**
   * Create initial pipeline step (received CV)
   */
  async createInitialStep(
    candidateId: number,
    applicationId: number,
    status?: string
  ): Promise<RecruitmentCandidatePipeline> {
    return this.create({
      candidateId,
      applicationId,
      recruitmentPipelineCode: status || RECRUITMENT_PIPELINE_CODES.RECEIVED_CV,
      startTime: new Date(),
      result: PIPELINE_RESULT.PENDING,
    });
  }

  /**
   * Find pipeline history by application ID
   */
  async findByApplicationId(
    applicationId: number
  ): Promise<RecruitmentCandidatePipeline[]> {
    return this.pipelineRepository.find({
      where: { applicationId },
      order: { startTime: "ASC" },
    });
  }

  /**
   * Find pipeline history by candidate ID
   */
  async findByCandidateId(
    candidateId: number
  ): Promise<RecruitmentCandidatePipeline[]> {
    return this.pipelineRepository.find({
      where: { candidateId },
      order: { startTime: "ASC" },
    });
  }

  /**
   * Find active (no endTime) pipeline by application ID
   */
  async findActivePipelineByApplicationId(
    applicationId: number
  ): Promise<RecruitmentCandidatePipeline | null> {
    return this.pipelineRepository.findOne({
      where: {
        applicationId,
        endTime: null as any,
      },
      order: { startTime: "DESC" },
    });
  }

  /**
   * Update pipeline result
   */
  async updateResult(
    id: number,
    result: "pass" | "fail" | "pending",
    endTime?: Date,
    note?: string
  ): Promise<RecruitmentCandidatePipeline> {
    const pipeline = await this.pipelineRepository.findOne({ where: { id } });
    if (!pipeline) {
      throw new Error(`Pipeline with ID ${id} not found`);
    }

    pipeline.result = result;
    if (endTime) pipeline.endTime = endTime;
    if (note !== undefined) pipeline.note = note;

    const saved = await this.pipelineRepository.save(pipeline);
    this.logger.log(`Updated pipeline ${id} with result: ${result}`);
    return saved;
  }

  /**
   * Save pipeline using query runner
   */
  async saveWithQueryRunner(
    pipeline: RecruitmentCandidatePipeline,
    queryRunner: any
  ): Promise<RecruitmentCandidatePipeline> {
    return queryRunner.manager.save(pipeline);
  }
}
