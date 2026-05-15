import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { RecruitmentPipeline } from "src/entities/recruitment-pipeline";
import { Repository } from "typeorm";
import { LoggerService } from "../../../common/logger/logger.service";

@Injectable()
export class PipelineService {
  private readonly logger = new LoggerService("PipelineService");

  constructor(
    @InjectRepository(RecruitmentPipeline)
    private readonly pipelineRepository: Repository<RecruitmentPipeline>
  ) {}

  /**
   * Get all recruitment pipeline stages (no pagination)
   * @returns Array of all pipeline stages ordered by order field
   */
  async findAll(): Promise<RecruitmentPipeline[]> {
    try {
      this.logger.log("Fetching all recruitment pipeline stages");

      const pipelines = await this.pipelineRepository.find({
        where: { isActive: 1 },
        order: { order: "ASC" },
      });

      this.logger.log(`Found ${pipelines.length} active pipeline stages`);
      return pipelines;
    } catch (error) {
      this.logger.error("Error fetching recruitment pipelines", error);
      throw error;
    }
  }

  /**
   * Get all recruitment pipeline stages including inactive ones
   * @returns Array of all pipeline stages
   */
  async findAllIncludingInactive(): Promise<RecruitmentPipeline[]> {
    try {
      this.logger.log(
        "Fetching all recruitment pipeline stages (including inactive)"
      );

      const pipelines = await this.pipelineRepository.find({
        order: { order: "ASC" },
      });

      this.logger.log(`Found ${pipelines.length} total pipeline stages`);
      return pipelines;
    } catch (error) {
      this.logger.error("Error fetching all recruitment pipelines", error);
      throw error;
    }
  }

  /**
   * Find a pipeline stage by code
   * @param code Pipeline stage code
   * @returns Pipeline stage or null
   */
  async findByCode(code: string): Promise<RecruitmentPipeline | null> {
    try {
      return await this.pipelineRepository.findOne({
        where: { code, isActive: 1 },
      });
    } catch (error) {
      this.logger.error(`Error finding pipeline by code: ${code}`, error);
      throw error;
    }
  }

  /**
   * Find a pipeline stage by ID
   * @param id Pipeline stage ID
   * @returns Pipeline stage or null
   */
  async findById(id: number): Promise<RecruitmentPipeline | null> {
    try {
      return await this.pipelineRepository.findOne({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Error finding pipeline by id: ${id}`, error);
      throw error;
    }
  }
}
