import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SORT } from "../../../common/constants/constants";
import { LoggerService } from "../../../common/logger/logger.service";
import { PageRequest } from "../../../entities/base/pagination.entity";
import { RecruitmentApplications } from "../../../entities/recruitment-applications";
import { RecruitmentCandidates } from "../../../entities/recruitment-candidates";
import { RecruitmentCandidatesCv } from "../../../entities/recruitment-candidates-cv";
import { RecruitmentOrder } from "../../../entities/recruitment-order";
import { RecruitmentPipeline } from "../../../entities/recruitment-pipeline";
import { BaseHeaderDTO } from "../../base/base.header";
import { FindAllCandidatesQueryDto } from "../dto/find-all-candidates-query.dto";

@Injectable()
export class CandidateService {
  private readonly logger = new LoggerService("CandidateService");

  constructor(
    @InjectRepository(RecruitmentCandidates)
    private candidatesRepository: Repository<RecruitmentCandidates>,
  ) {}

  async findByEmail(
    email: string,
  ): Promise<RecruitmentCandidates | null> {
    return this.candidatesRepository.findOne({
      where: { email },
    });
  }

  async findById(
    id: number,
    relations: string[] = [],
  ): Promise<RecruitmentCandidates | null> {
    return this.candidatesRepository.findOne({
      where: { id },
      relations,
    });
  }

  async create(data: {
    fullName: string;
    phone: string;
    email: string;
    gender?: string;
    universitySchool?: string;
  }): Promise<RecruitmentCandidates> {
    const candidate = this.candidatesRepository.create(data);
    const saved = await this.candidatesRepository.save(candidate);
    this.logger.log(`Created new candidate with email: ${data.email}`);
    return saved;
  }

  createEntity(data: {
    fullName: string;
    phone: string;
    email: string;
    gender?: string;
    universitySchool?: string;
    birthday?: string;
  }): RecruitmentCandidates {
    return this.candidatesRepository.create(data);
  }

  async findByIdWithRelations(
    id: number,
  ): Promise<RecruitmentCandidates> {
    const candidate = await this.candidatesRepository
      .createQueryBuilder("candidate")
      .leftJoinAndSelect("candidate.applications", "applications")
      .leftJoinAndSelect("applications.cvs", "cvs")
      .leftJoinAndSelect("applications.pipelineHistory", "pipelineHistory")
      .leftJoinAndSelect("pipelineHistory.creator", "creator")
      .leftJoinAndMapOne(
        "applications.orderInfo",
        RecruitmentOrder,
        "order",
        "applications.position = CAST(order.id AS CHAR)",
      )
      .select([
        "candidate",
        "applications",
        "cvs",
        "pipelineHistory",
        "creator.personnelCode",
        "creator.personnelName",
        "order",
      ])
      .where("candidate.id = :id", { id })
      .getOne();

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }

    return candidate;
  }

  async saveWithQueryRunner(
    candidate: RecruitmentCandidates,
    queryRunner: any,
  ): Promise<RecruitmentCandidates> {
    return queryRunner.manager.save(candidate);
  }

  async update(
    id: number,
    data: Partial<{
      fullName: string;
      phone: string;
      email: string;
      gender: string;
      universitySchool: string;
      birthday: string;
    }>,
  ): Promise<RecruitmentCandidates> {
    const candidate = await this.findById(id);

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }

    // Only update fields that are provided (not undefined)
    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined) {
        candidate[key] = data[key];
      }
    });

    const updated = await this.candidatesRepository.save(candidate);
    this.logger.log(`Updated candidate with ID: ${id}`);
    return updated;
  }

  async findAll(
    header: BaseHeaderDTO,
    query: FindAllCandidatesQueryDto,
  ): Promise<[RecruitmentCandidates[], number]> {
    const { page, size, active, direction } = header;
    const {
      fullName,
      position,
      status,
      department,
      level,
      source,
      universitySchool,
      gender,
      pipelineCode,
      pipelineResult,
      startDate,
      endDate,
    } = query;

    const toArray = (val?: string) =>
      val
        ?.split(",")
        .map((v) => v.trim())
        .filter(Boolean) ?? [];

    const positions = toArray(position);
    const statuses = toArray(status);
    const departments = toArray(department);
    const levels = toArray(level);
    const sources = toArray(source);
    const universities = toArray(universitySchool);
    const genders = toArray(gender);
    const pipelineCodes = toArray(pipelineCode);
    const pipelineResults = toArray(pipelineResult);

    const paginate = new PageRequest(page, size, `${active},${direction}`);

    const queryBuilder = this.candidatesRepository
      .createQueryBuilder("candidate")
      .leftJoinAndMapMany(
        "candidate.applications",
        RecruitmentApplications,
        "application",
        "candidate.id = application.candidateId",
      )
      .leftJoinAndMapMany(
        "application.cvs",
        RecruitmentCandidatesCv,
        "cv",
        "application.id = cv.applicationId",
      )
      .leftJoinAndMapOne(
        "application.pipelineInfo",
        RecruitmentPipeline,
        "pipeline",
        "application.status = pipeline.code",
      )
      .leftJoinAndMapOne(
        "application.orderInfo",
        RecruitmentOrder,
        "order",
        "application.position = CAST(order.id AS CHAR)",
      );

    if (fullName) {
      queryBuilder.andWhere(
        "(candidate.fullName LIKE :fullName OR candidate.email LIKE :fullName OR application.createdBy LIKE :fullName)",
        {
          fullName: `%${fullName}%`,
        },
      );
    }

    if (positions.length) {
      queryBuilder.andWhere(
        "(order.position IN (:...positions) OR application.position IN (:...positions))",
        { positions },
      );
    }

    if (statuses.length) {
      queryBuilder.andWhere("application.status IN (:...statuses)", {
        statuses,
      });
    }

    if (departments.length) {
      queryBuilder.andWhere("application.department IN (:...departments)", {
        departments,
      });
    }

    if (levels.length) {
      queryBuilder.andWhere("application.level IN (:...levels)", { levels });
    }

    if (sources.length) {
      queryBuilder.andWhere("application.source IN (:...sources)", { sources });
    }

    if (universities.length) {
      queryBuilder.andWhere(
        "candidate.universitySchool IN (:...universities)",
        { universities },
      );
    }

    if (genders.length) {
      queryBuilder.andWhere("candidate.gender IN (:...genders)", { genders });
    }

    if (pipelineCodes.length || pipelineResults.length) {
      const pipelineTable = this.candidatesRepository.manager.getRepository(
        RecruitmentPipeline,
      ).metadata.tableName;

      const conditions: string[] = ["cp.application_id = application.id"];
      const params: Record<string, unknown> = {};

      if (pipelineCodes.length) {
        conditions.push("cp.recruitment_pipeline_code IN (:...pipelineCodes)");
        params.pipelineCodes = pipelineCodes;
      }

      if (pipelineResults.length) {
        conditions.push("cp.result IN (:...pipelineResults)");
        params.pipelineResults = pipelineResults;
      }

      queryBuilder.andWhere(
        `EXISTS (SELECT 1 FROM ${pipelineTable} cp WHERE ${conditions.join(
          " AND ",
        )})`,
        params,
      );
    }

    if (startDate) {
      queryBuilder.andWhere(
        "DATE(application.appliedDate) >= DATE(:startDate)",
        {
          startDate,
        },
      );
    }

    if (endDate) {
      queryBuilder.andWhere("DATE(application.appliedDate) <= DATE(:endDate)", {
        endDate,
      });
    }

    // Sorting
    if (active && direction) {
      const sortDirection =
        direction.toUpperCase() === SORT.DESC ? SORT.DESC : SORT.ASC;

      // Fields from application table
      const applicationFields = [
        "position",
        "level",
        "status",
        "appliedDate",
        "source",
      ];

      if (applicationFields.includes(active)) {
        queryBuilder.orderBy(`application.${active}`, sortDirection);
      } else {
        // Fields from candidate table
        queryBuilder.orderBy(`candidate.${active}`, sortDirection);
      }
    } else {
      queryBuilder.orderBy("candidate.id", "DESC");
    }

    const [data, total] = await queryBuilder
      .skip(paginate.skip)
      .take(paginate.size)
      .getManyAndCount();

    this.logger.log(
      `Found ${total} candidates with filters (page: ${page}, size: ${size})`,
    );

    return [data, total];
  }
}
