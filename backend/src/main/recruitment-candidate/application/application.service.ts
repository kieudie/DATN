import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RECRUITMENT_PIPELINE_CODES } from "../../../common/constants/recruitment.constants";
import { LoggerService } from "../../../common/logger/logger.service";
import { RecruitmentApplications } from "../../../entities/recruitment-applications";
import { RecruitmentOrder } from "../../../entities/recruitment-order";

@Injectable()
export class ApplicationService {
  //private readonly logger = new LoggerService("ApplicationService");
  private readonly logger = new LoggerService();

 // constructor(
   // @InjectRepository(RecruitmentApplications)
   // private applicationsRepository: Repository<RecruitmentApplications>,
  //) {}
  constructor(
  @InjectRepository(RecruitmentApplications)
  private applicationsRepository: Repository<RecruitmentApplications>,
) {
  this.logger.setContext('ApplicationService');
}

  /**
   * Create new application
   */
  async create(data: {
    candidateId: number;
    position?: string;
    level?: string;
    department?: string;
    source?: string;
    appliedDate?: Date;
    status?: string;
    iqTest?: string;
    techTest?: string;
    thinkingTest?: string;
    onboardingDate?: Date;
    note?: string;
  }): Promise<RecruitmentApplications> {
    const application = this.applicationsRepository.create({
      ...data,
      status: data.status || RECRUITMENT_PIPELINE_CODES.RECEIVED_CV,
    });
    const saved = await this.applicationsRepository.save(application);
    this.logger.log(
      `Created application id: ${saved.id} for candidate: ${data.candidateId}`,
    );
    return saved;
  }

  /**
   * Create application entity (without saving)
   */
  createEntity(data: {
    candidateId: number;
    // position: string;
    position?: string;
    level?: string;
    department?: string;
    source?: string;
    appliedDate?: Date;
    status?: string;
    iqTest?: string;
    techTest?: string;
    thinkingTest?: string;
    gpa?: string;
    onboardingDate?: Date;
    note?: string;
    createdBy?: number;
  }): RecruitmentApplications {
    return this.applicationsRepository.create({
      ...data,
      status: data.status || RECRUITMENT_PIPELINE_CODES.RECEIVED_CV,
    });
  }

  /**
   * Find application by ID with relations
   */
  async findById(
    id: number,
    relations: string[] = [],
  ): Promise<RecruitmentApplications | null> {
    return this.applicationsRepository.findOne({
      where: { id },
      relations,
    });
  }

  /**
   * Find application by ID with full relations
   */
  async findByIdWithRelations(
    id: number,
  ): Promise<RecruitmentApplications> {
    const application = await this.applicationsRepository
      .createQueryBuilder("application")
      .leftJoinAndSelect("application.candidate", "candidate")
      .leftJoinAndSelect("application.cvs", "cvs")
      .leftJoinAndSelect("application.pipelineHistory", "pipelineHistory")
    //  .leftJoinAndSelect("pipelineHistory.creator", "creator", undefined, {
      //  personnelCode: true,
        //personnelName: true,
      //})
      .leftJoinAndMapOne(
        "application.orderInfo",
        RecruitmentOrder,
        "order",
        "application.position = CAST(order.id AS CHAR)",
      )
      .where("application.id = :id", { id })
      .getOne();

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    return application;
  }

  /**
   * Find latest application by candidate ID
   */
  async findLatestByCandidateId(
    candidateId: number,
  ): Promise<RecruitmentApplications | null> {
    return this.applicationsRepository.findOne({
      where: { candidateId },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Save application using query runner
   */
  async saveWithQueryRunner(
    application: RecruitmentApplications,
    queryRunner: any,
  ): Promise<RecruitmentApplications> {
    return queryRunner.manager.save(application);
  }

  /**
   * Update application
   */
  async update(
    id: number,
    data: Partial<{
      position: string;
      level: string;
      department: string;
      source: string;
      appliedDate: Date;
      status: string;
      iqTest: string;
      techTest: string;
      thinkingTest: string;
      gpa: string;
      onboardingDate: Date;
      note: string;
      testOnlineStatus: string;
    }>,
  ): Promise<RecruitmentApplications> {
    const application = await this.findById(id);

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    // Only update fields that are provided (not undefined)
    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined) {
        application[key] = data[key];
      }
    });

    const updated = await this.applicationsRepository.save(application);
    this.logger.log(`Updated application with ID: ${id}`);
    return updated;
  }
}
