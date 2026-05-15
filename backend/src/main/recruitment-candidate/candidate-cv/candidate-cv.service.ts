import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { LoggerService } from "../../../common/logger/logger.service";
import { RecruitmentCandidatesCv } from "../../../entities/recruitment-candidates-cv";

@Injectable()
export class CandidateCvService {
  private readonly logger = new LoggerService();

constructor(
  @InjectRepository(RecruitmentCandidatesCv)
  private candidatesCvRepository: Repository<RecruitmentCandidatesCv>,
) {
  this.logger.setContext('CandidateCvService');
}

  /**
   * Create new CV record
   */
  async create(data: {
    candidateId: number;
    applicationId: number;
    filePath: string;
  }): Promise<RecruitmentCandidatesCv> {
    const cv = this.candidatesCvRepository.create(data);
    const saved = await this.candidatesCvRepository.save(cv);
    this.logger.log(`Created CV for application: ${data.applicationId}`);
    return saved;
  }

  /**
   * Create CV entity (without saving)
   */
  createEntity(data: {
    candidateId: number;
    applicationId: number;
    filePath: string;
    productLinks?: string;
  }): RecruitmentCandidatesCv {
    return this.candidatesCvRepository.create(data);
  }

  /**
   * Find CV by application ID
   */
  async findByApplicationId(
    applicationId: number,
  ): Promise<RecruitmentCandidatesCv[]> {
    return this.candidatesCvRepository.find({
      where: { applicationId },
    });
  }

  /**
   * Find CV by candidate ID
   */
  async findByCandidateId(
    candidateId: number,
  ): Promise<RecruitmentCandidatesCv[]> {
    return this.candidatesCvRepository.find({
      where: { candidateId },
    });
  }

  /**
   * Save CV using query runner
   */
  async saveWithQueryRunner(
    cv: RecruitmentCandidatesCv,
    queryRunner: any,
  ): Promise<RecruitmentCandidatesCv> {
    return queryRunner.manager.save(cv);
  }

  async updateOrCreateByApplicationId(
    applicationId: number,
    candidateId: number,
    filePath: string,
    productLinks?: string,
  ): Promise<RecruitmentCandidatesCv> {
    // Find existing CV for this application
    const existingCv = await this.candidatesCvRepository.findOne({
      where: { applicationId },
    });

    if (existingCv) {
      // Update existing CV
      existingCv.filePath = filePath;
      if (productLinks !== undefined) {
        existingCv.productLinks = productLinks;
      }
      const updated = await this.candidatesCvRepository.save(existingCv);
      this.logger.log(`Updated CV for application: ${applicationId}`);
      return updated;
    } else {
      // Create new CV
      const cv = this.candidatesCvRepository.create({
        candidateId,
        applicationId,
        filePath,
        productLinks,
      });
      const saved = await this.candidatesCvRepository.save(cv);
      this.logger.log(`Created new CV for application: ${applicationId}`);
      return saved;
    }
  }
}
