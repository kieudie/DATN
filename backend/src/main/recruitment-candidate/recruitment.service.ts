import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { readFile } from 'fs/promises';
import { extname } from 'path';
import { DataSource } from 'typeorm';
import {
  PIPELINE_RESULT,
  RECRUITMENT_PIPELINE_CODES,
} from '../../common/constants/recruitment.constants';
import { handleResPagination } from '../../common/functions/paginate';
import { LoggerService } from '../../common/logger/logger.service';
import { PageRequest } from '../../entities/base/pagination.entity';
import { RecruitmentApplications } from '../../entities/recruitment-applications';
import { RecruitmentCandidates } from '../../entities/recruitment-candidates';
import { RecruitmentOrder } from '../../entities/recruitment-order';
import { BaseHeaderDTO } from '../base/base.header';
import { ApplicationService } from './application/application.service';
import { CandidateCvService } from './candidate-cv/candidate-cv.service';
import { CandidatePipelineService } from './candidate-pipeline/candidate-pipeline.service';
import { CandidateService } from './candidate/candidate.service';
import { BulkImportResultDTO } from './dto/bulk-import-response.dto';
import {
  CandidateApplicationHistoryDTO,
  CheckCandidateResponseDTO,
} from './dto/check-candidate-response.dto';
import { CheckCandidateDTO } from './dto/check-candidate.dto';
import { CreateCandidateDTO } from './dto/create-candidate.dto';
import { FindAllCandidatesQueryDto } from './dto/find-all-candidates-query.dto';
import { MailRecruitmentDTO } from './dto/mail-recruitment.dto';
import { PipelineStageDTO } from './dto/pipeline-stage.dto';
import { UpdateApplicationDTO } from './dto/update-application.dto';
import { UpdateCandidateStatusDTO } from './dto/update-candidate-status.dto';
import { UpdateCandidateDTO } from './dto/update-candidate.dto';
import { PipelineService } from './pipeline/pipeline.service';
type UploadedFileType = {
  originalname: string;
  filename: string;
  path: string;
  mimetype?: string;
  size?: number;
};
@Injectable()
export class RecruitmentService {
  private readonly logger = new LoggerService();

  constructor(
    private readonly candidateService: CandidateService,
    private readonly applicationService: ApplicationService,
    private readonly candidateCvService: CandidateCvService,
    private readonly candidatePipelineService: CandidatePipelineService,
    private readonly pipelineService: PipelineService,
    private dataSource: DataSource,
  ) {
    this.logger.setContext('RecruitmentService');
  }

  async getAllPipelineStages(): Promise<PipelineStageDTO[]> {
    const pipelines = await this.pipelineService.findAll();

    return pipelines.map((pipeline) => ({
      id: pipeline.id as number,
      name: pipeline.name,
      code: pipeline.code,
      order: pipeline.order,
      isActive: pipeline.isActive,
    }));
  }

  async createCandidate(
    createCandidateDto: CreateCandidateDTO,
    userId: number,
    res: Response,
  ) {
    try {
      const result = await this.createCandidateWithTransaction(
        createCandidateDto,
        userId,
      );

      return res.status(HttpStatus.CREATED).json(result);
    } catch (error) {
      this.logger.error(`Error creating candidate: ${error.message}`);

      if (error instanceof ConflictException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to create candidate. Please try again.',
      );
    }
  }

  async findCandidateById(id: number, res: Response) {
    try {
      const candidate = await this.candidateService.findByIdWithRelations(id);

      return res.status(HttpStatus.OK).json(candidate);
    } catch (error) {
      this.logger.error(`Error finding candidate: ${error.message}`);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to find candidate. Please try again.',
      );
    }
  }

  async findAllCandidates(
    header: BaseHeaderDTO,
    query: FindAllCandidatesQueryDto,
    res: Response,
  ) {
    try {
      const page = header.page ?? '0';
      const size = header.size ?? '20';
      const active = header.active ?? 'id';
      const direction = header.direction ?? 'DESC';
      const paginate = new PageRequest(page, size, `${active},${direction}`);

      const [data, total] = await this.candidateService.findAll(header, query);

      const result = handleResPagination(
        data,
        total,
        paginate.page,
        paginate.size,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      this.logger.error(`Error finding all candidates: ${error.message}`);

      throw new InternalServerErrorException(
        'Failed to retrieve candidates. Please try again.',
      );
    }
  }

  async updateCandidate(
    candidateId: number,
    updateCandidateDto: UpdateCandidateDTO,
    res: Response,
  ) {
    try {
      await this.candidateService.update(candidateId, {
        fullName: updateCandidateDto.fullName,
        phone: updateCandidateDto.phone,
        email: updateCandidateDto.email,
        gender: updateCandidateDto.gender,
        universitySchool: updateCandidateDto.universitySchool,
        birthday: updateCandidateDto.birthday ?? undefined,
      });

      const result = await this.candidateService.findByIdWithRelations(candidateId);

      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      this.logger.error(`Error updating candidate: ${error.message}`);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to update candidate. Please try again.',
      );
    }
  }

  async updateApplication(
    applicationId: number,
    updateApplicationDto: UpdateApplicationDTO,
    res: Response,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const application = await this.applicationService.findById(applicationId);
      if (!application) {
        throw new NotFoundException(`Application with ID ${applicationId} not found`);
      }

      await this.applicationService.update(applicationId, {
        position: updateApplicationDto.position,
        level: updateApplicationDto.level,
        department: updateApplicationDto.department,
        source: updateApplicationDto.source,
        appliedDate: updateApplicationDto.appliedDate
          ? new Date(updateApplicationDto.appliedDate)
          : undefined,
        iqTest: updateApplicationDto.iqTest,
        techTest: updateApplicationDto.techTest,
        thinkingTest: updateApplicationDto.thinkingTest,
        gpa: updateApplicationDto.gpa,
        note: updateApplicationDto.note,
        testOnlineStatus: updateApplicationDto.testOnlineStatus,
      });

      if (updateApplicationDto.filePath) {
        await this.candidateCvService.updateOrCreateByApplicationId(
          applicationId,
          application.candidateId,
          updateApplicationDto.filePath,
          updateApplicationDto.productLinks,
        );
      }

      await queryRunner.commitTransaction();

      const result = await this.applicationService.findByIdWithRelations(applicationId);

      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error updating application: ${error.message}`);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to update application. Please try again.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async updateCandidateStatus(
    candidateId: number,
    updateStatusDto: UpdateCandidateStatusDTO,
    userId: number,
    res: Response,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const candidate = await this.candidateService.findById(candidateId);
      if (!candidate) {
        throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
      }

      const latestApplication =
        await this.applicationService.findLatestByCandidateId(candidateId);
      if (!latestApplication) {
        throw new NotFoundException(
          `No application found for candidate ID ${candidateId}`,
        );
      }

      const targetPipeline = await this.pipelineService.findByCode(
        updateStatusDto.status,
      );
      if (!targetPipeline) {
        throw new BadRequestException(
          `Invalid target status code: ${updateStatusDto.status}`,
        );
      }

      const currentPipeline =
        await this.candidatePipelineService.findActivePipelineByApplicationId(
          latestApplication.id as number,
        );

      if (currentPipeline) {
        currentPipeline.endTime = new Date();
        currentPipeline.result =
          updateStatusDto.previousResult || PIPELINE_RESULT.PENDING;
        await queryRunner.manager.save(currentPipeline);
      }

      const newPipeline = this.candidatePipelineService.createEntity({
        candidateId: candidate.id as number,
        applicationId: latestApplication.id as number,
        recruitmentPipelineCode: updateStatusDto.status,
        startTime: new Date(),
        result: PIPELINE_RESULT.PENDING,
       note: updateStatusDto.note,
        createdBy: userId,
      });
      await queryRunner.manager.save(newPipeline);

      latestApplication.status = updateStatusDto.status;

      if (updateStatusDto.onboardingDate) {
        latestApplication.onboardingDate = new Date(updateStatusDto.onboardingDate);
      }

      await queryRunner.manager.save(latestApplication);
      await queryRunner.commitTransaction();

      const result = await this.candidateService.findByIdWithRelations(candidateId);

      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error updating candidate status: ${error.message}`);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to update candidate status. Please try again.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async bulkImportFromCSV(
    file: UploadedFileType,
    userId: number,
    res: Response,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result: BulkImportResultDTO = {
      totalRecords: 0,
      successCount: 0,
      failedCount: 0,
      errors: [],
    };

    const ext = extname(file.originalname).toLowerCase();

    if (ext !== '.csv') {
      result.errors.push({
        row: 0,
        error: 'Hiện tại API này chỉ xử lý CSV. File Excel sẽ làm bước sau.',
      });
      result.failedCount = 1;
      return res.status(HttpStatus.OK).json(result);
    }

    const content = await readFile(file.path, 'utf8');
    const rows = this.parseCsv(content);
    result.totalRecords = rows.length;

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];

      try {
        const dto: CreateCandidateDTO = {
          fullName: row['Họ và tên'] || row.fullName || row.name,
          phone: row['SĐT'] || row.phone,
          email: row.Email || row.email,
          gender: row['Giới tính'] || row.gender,
          universitySchool: row['Trường ĐH'] || row.universitySchool,
          filePath: row['Link CV'] || row.filePath,
          position: row['Vị trí tuyển dụng'] || row.position,
          level: row.Level || row.level,
          department: row['Phòng ban'] || row.department,
          source: row['Nguồn tuyển dụng'] || row.source,
          appliedDate: row['NGÀY (YYYY-MM-DD)'] || row.appliedDate,
          status: RECRUITMENT_PIPELINE_CODES.RECEIVED_CV,
          iqTest: row['Test IQ'] || row.iqTest,
          techTest: row['Test Chuyên môn'] || row.techTest,
          thinkingTest: row['Test Tư Duy'] || row.thinkingTest,
        };

        if (!dto.email) {
          throw new BadRequestException('Email is required');
        }

        await this.createCandidateWithTransaction(dto, userId);
        result.successCount += 1;
      } catch (error) {
        result.failedCount += 1;
        result.errors.push({
          row: index + 2,
          email: row.Email || row.email,
          fullName: row['Họ và tên'] || row.fullName || row.name,
          error: error.message || 'Import failed',
        });
      }
    }

    return res.status(HttpStatus.OK).json(result);
  }

  async getCandidatesGroupedByStatus(
    position?: string,
    search?: string,
    startDate?: string,
    endDate?: string,
    pic?: string,
  ) {
    const pipelines = await this.pipelineService.findAll();

    const queryBuilder = this.dataSource
      .getRepository(RecruitmentApplications)
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.candidate', 'candidate')
      .leftJoinAndSelect('application.cvs', 'cvs')
      .leftJoinAndMapOne(
        'application.orderInfo',
        RecruitmentOrder,
        'recruitmentOrder',
        'application.position = CAST(recruitmentOrder.id AS CHAR)',
      );

    if (position) {
      queryBuilder.andWhere(
        '(application.position LIKE :position OR recruitmentOrder.position LIKE :position)',
        { position: `%${position}%` },
      );
    }

    if (search) {
      queryBuilder.andWhere(
        '(candidate.fullName LIKE :search OR candidate.email LIKE :search OR candidate.phone LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (startDate) {
      queryBuilder.andWhere('application.appliedDate >= :startDate', {
        startDate,
      });
    }

    if (endDate) {
      queryBuilder.andWhere('application.appliedDate <= :endDate', {
        endDate,
      });
    }

    if (pic) {
      queryBuilder.andWhere('CAST(application.createdBy AS CHAR) LIKE :pic', {
        pic: `%${pic}%`,
      });
    }

    const applications = await queryBuilder
      .orderBy('application.createdAt', 'DESC')
      .getMany();

    const groupedMap = new Map<string, RecruitmentApplications[]>();
    applications.forEach((application) => {
      const status = application.status || RECRUITMENT_PIPELINE_CODES.RECEIVED_CV;
      groupedMap.set(status, [...(groupedMap.get(status) || []), application]);
    });

    const pipelineGroups = pipelines.map((pipeline) => {
      const candidates = groupedMap.get(pipeline.code) || [];
      groupedMap.delete(pipeline.code);

      return {
        status: pipeline.code,
        statusName: pipeline.name,
        displayOrder: pipeline.order,
        count: candidates.length,
        candidates: candidates.map((application) =>
          this.mapApplicationToGroupedCandidate(application),
        ),
      };
    });

    const unknownGroups = Array.from(groupedMap.entries()).map(
      ([status, candidates], index) => ({
        status,
        statusName: status,
        displayOrder: pipelines.length + index + 1,
        count: candidates.length,
        candidates: candidates.map((application) =>
          this.mapApplicationToGroupedCandidate(application),
        ),
      }),
    );

    return [...pipelineGroups, ...unknownGroups];
  }

  async sendEmails(
    candidateId: number,
    mailData: MailRecruitmentDTO,
   files: UploadedFileType[] = [],
    res: Response,
  ) {
    const candidate = await this.candidateService.findByIdWithRelations(candidateId);

    return res.status(HttpStatus.NOT_IMPLEMENTED).json({
      message:
        'Chưa implement gửi email vì dự án mới chưa có mail-recruitment/scheduled-job/socket như dự án cũ.',
      candidateId,
      candidate,
      mailData,
      attachments: files?.map((file) => ({
        originalname: file.originalname,
        filename: file.filename,
        path: file.path,
      })),
    });
  }

  async getPositionStatistics() {
    const rows = await this.dataSource
      .getRepository(RecruitmentApplications)
      .createQueryBuilder('application')
      .leftJoin(
        RecruitmentOrder,
        'recruitmentOrder',
        'application.position = CAST(recruitmentOrder.id AS CHAR)',
      )
      .select('COALESCE(recruitmentOrder.position, application.position)', 'position')
      .addSelect('COUNT(application.id)', 'count')
      .groupBy('COALESCE(recruitmentOrder.position, application.position)')
      .orderBy('count', 'DESC')
      .getRawMany();

    const positions = rows.map((row) => ({
      position: row.position || 'Không xác định',
      count: Number(row.count || 0),
    }));

    const totalApplications = positions.reduce(
      (total, item) => total + item.count,
      0,
    );

    return {
      positions,
      totalApplications,
    };
  }

  async checkCandidateByEmailOrPhone(
    checkCandidateDto: CheckCandidateDTO,
  ): Promise<CheckCandidateResponseDTO> {
    const { email, phone } = checkCandidateDto;

    if (!email && !phone) {
      throw new BadRequestException('Either email or phone must be provided');
    }

    const queryBuilder = this.dataSource
      .getRepository(RecruitmentCandidates)
      .createQueryBuilder('candidate')
      .leftJoinAndSelect('candidate.applications', 'applications')
      .leftJoinAndMapOne(
        'applications.orderInfo',
        RecruitmentOrder,
        'recruitmentOrder',
        'applications.position = CAST(recruitmentOrder.id AS CHAR)',
      );

    if (email && phone) {
      queryBuilder.where('candidate.email = :email OR candidate.phone = :phone', {
        email,
        phone,
      });
    } else if (email) {
      queryBuilder.where('candidate.email = :email', { email });
    } else {
      queryBuilder.where('candidate.phone = :phone', { phone });
    }

    const candidate = await queryBuilder.getOne();

    if (!candidate) {
      return {
        exists: false,
        candidateId: null,
        fullName: null,
        email: null,
        phone: null,
        universitySchool: null,
        birthday: null,
        gender: null,
        applications: [],
      };
    }

    const applications: CandidateApplicationHistoryDTO[] =
      candidate.applications?.map((application) => ({
        applicationId: application.id as number,
        position:
          ((application as any).orderInfo?.position as string) ||
          application.position ||
          '',
        level: application.level,
        gpa: application.gpa,
        department: application.department,
        status: application.status,
        appliedDate: application.appliedDate,
        createdAt: application.createdAt,
      })) || [];

    return {
      exists: true,
      candidateId: candidate.id as number,
      fullName: candidate.fullName,
      email: candidate.email,
      phone: candidate.phone,
      universitySchool: candidate.universitySchool,
      birthday: candidate.birthday,
      gender: candidate.gender,
      applications,
    };
  }

  private async createCandidateWithTransaction(
    createCandidateDto: CreateCandidateDTO,
    userId: number,
  ): Promise<RecruitmentApplications> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let candidate = await this.candidateService.findByEmail(
        createCandidateDto.email,
      );

      if (!candidate) {
        const candidateEntity = this.candidateService.createEntity({
          fullName: createCandidateDto.fullName,
          phone: createCandidateDto.phone,
          email: createCandidateDto.email,
          gender: createCandidateDto.gender,
          universitySchool: createCandidateDto.universitySchool,
          birthday: createCandidateDto.birthday ?? undefined,
        });
        candidate = await queryRunner.manager.save(candidateEntity);
      }

      const applicationEntity = this.applicationService.createEntity({
        candidateId: candidate.id as number,
        position: createCandidateDto.position,
        level: createCandidateDto.level,
        department: createCandidateDto.department,
        source: createCandidateDto.source,
        appliedDate: createCandidateDto.appliedDate
          ? new Date(createCandidateDto.appliedDate)
          : undefined,
        status:
          createCandidateDto.status || RECRUITMENT_PIPELINE_CODES.RECEIVED_CV,
        iqTest: createCandidateDto.iqTest,
        techTest: createCandidateDto.techTest,
        thinkingTest: createCandidateDto.thinkingTest,
        gpa: createCandidateDto.gpa,
        note: createCandidateDto.note,
        createdBy: userId,
      });
      const application = await queryRunner.manager.save(applicationEntity);

      if (createCandidateDto.filePath) {
        const cvEntity = this.candidateCvService.createEntity({
          candidateId: candidate.id as number,
          applicationId: application.id as number,
          filePath: createCandidateDto.filePath,
          productLinks: createCandidateDto.productLinks,
        });
        await queryRunner.manager.save(cvEntity);
      }

      const pipelineEntity = this.candidatePipelineService.createEntity({
        candidateId: candidate.id as number,
        applicationId: application.id as number,
        recruitmentPipelineCode:
          createCandidateDto.status || RECRUITMENT_PIPELINE_CODES.RECEIVED_CV,
        startTime: new Date(),
        result: PIPELINE_RESULT.PENDING,
        createdBy: userId,
      });
      await queryRunner.manager.save(pipelineEntity);

      await queryRunner.commitTransaction();

      return this.applicationService.findByIdWithRelations(application.id as number);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error creating candidate transaction: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private parseCsv(content: string): Record<string, string>[] {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length <= 1) {
      return [];
    }

    const headers = this.parseCsvLine(lines[0]).map((header) => header.trim());

    return lines.slice(1).map((line) => {
      const values = this.parseCsvLine(line);
      return headers.reduce<Record<string, string>>((row, header, index) => {
        row[header] = values[index]?.trim() || '';
        return row;
      }, {});
    });
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let insideQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const nextChar = line[index + 1];

      if (char === '"' && nextChar === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  private mapApplicationToGroupedCandidate(application: RecruitmentApplications) {
    return {
      id: application.id,
      candidateId: application.candidateId,
      fullName: application.candidate?.fullName,
      phone: application.candidate?.phone,
      email: application.candidate?.email,
      gender: application.candidate?.gender,
      universitySchool: application.candidate?.universitySchool,
      position:
        ((application as any).orderInfo?.position as string) || application.position,
      level: application.level,
      department: application.department,
      source: application.source,
      appliedDate: application.appliedDate,
      status: application.status,
      note: application.note,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      cvs: application.cvs || [],
    };
  }
}