import {
  BadRequestException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { Response } from "express";
import {
  PIPELINE_RESULT,
  RECRUITMENT_PIPELINE_CODES,
  TestOnlineStatus,
} from "src/common/constants/recruitment.constants";
import { RecruitmentManagerPermission } from "src/entities/recruitment-manager-permission";
import { RoleType } from "src/security";
import { DataSource, Repository } from "typeorm";
import { SORT } from "../../common/constants/constants";
import { handleResPagination } from "../../common/functions/paginate";
import { PageRequest } from "../../entities/base/pagination.entity";
import {
  RecruitmentCandidateManagerReview,
  ReviewStatus,
} from "../../entities/recruitment-candidate-manager-review";
import { RecruitmentManager } from "../../entities/recruitment-manager";
import { BaseHeaderDTO } from "../base/base.header";
//import { SocketGateway } from "../socket/socket.gateway";
import { CreateCandidateReviewDTO } from "./dto/create-candidate-review.dto";
import { CreateManagerDTO } from "./dto/create-manager.dto";
import { FindAllCandidatesByManagerQueryDTO } from "./dto/find-all-candidates-by-manager-query.dto";
import { FindAllManagersQueryDto } from "./dto/find-all-managers-query.dto";
import { GetMyCandidatesQueryDto } from "./dto/get-my-candidates-query.dto";
import { ManagerResponseDTO } from "./dto/manager-response.dto";
import { UpdateCandidateReviewStatusDTO } from "./dto/update-candaidate-review-status.dto";
import { categorizeCandidateByReviewStatus } from "./helpers/categorize-candidate.helper";

@Injectable()
export class RecruitmentManagerService {
  private readonly logger = new Logger(RecruitmentManagerService.name);
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @InjectRepository(RecruitmentCandidateManagerReview)
    private reviewRepository: Repository<RecruitmentCandidateManagerReview>,
   // private readonly socketGateway: SocketGateway,
  ) {}

  /**
   * Upsert a recruitment manager (create or update based on email)
   */
  async upsertManager(
    createManagerDto: CreateManagerDTO,
    res: Response,
  ): Promise<Response> {
    this.logger.log(`upsertManager start email=${createManagerDto?.email}`);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { permissions } = createManagerDto;

      const dataToUpsert = {
        id: null,
        name: createManagerDto.name,
        email: createManagerDto.email,
        is_cc: createManagerDto.isCc ? 1 : 0,
        department_name: createManagerDto.departmentName,
        specialization: createManagerDto.specialization,
        is_techlead: createManagerDto.isTechlead || null,
      };

      // Upsert using query builder
      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(RecruitmentManager)
        .values(dataToUpsert)
        .orUpdate(
          ["name", "is_cc", "department_name", "specialization", "is_techlead"], // columns to update on duplicate
          ["email"], // conflict target (unique column)
        )
        .execute();

      // Retrieve the created/updated manager
      const manager = await queryRunner.manager.findOne(
        RecruitmentManager,
        {
          where: { email: createManagerDto.email },
        },
      );
      this.logger.debug(
        `upsertManager upserted manager email=${createManagerDto.email} id=${manager?.id}`,
      );

      // Handle permissions if provided
      if (permissions && Array.isArray(permissions)) {
        this.logger.debug(
          `upsertManager processing ${permissions.length} permissions for managerId=${manager.id}`,
        );
        const a = await queryRunner.manager
          .createQueryBuilder()
          .update(RecruitmentManagerPermission)
          .set({ isActive: 0 })
          .where("manager_id = :managerId", { managerId: manager.id })
          .execute();
        for (const perm of permissions) {
          // perm: { code: string, specialization: string }
          await queryRunner.manager
            .createQueryBuilder()
            .insert()
            .into(RecruitmentManagerPermission)
            .values({
              id: null,
              managerId: manager.id,
              scope: perm.scope,
              specialization: perm.specialization,
              isActive: 1,
            })
            .orUpdate(
              ["is_active"], // update lại active nếu đã tồn tại
              ["manager_id", "scope", "specialization"], // conflict target = unique key
            )
            .execute();
        }
        this.logger.debug(
          `upsertManager finished processing permissions for managerId=${manager.id}`,
        );
      }

      await queryRunner.commitTransaction();
      this.logger.log(
        `upsertManager committed transaction managerId=${manager.id}`,
      );

const activePermissions = await this.dataSource
  .getRepository(RecruitmentManagerPermission)
  .createQueryBuilder('perm')
  .where('perm.manager_id = :managerId', { managerId: manager.id })
  .andWhere('perm.is_active = 1')
  .getMany();

const response: ManagerResponseDTO = {
  id: manager.id,
  name: manager.name,
  email: manager.email,
  isCc: manager.is_cc === 1,
  departmentName: manager.department_name,
  specialization: manager.specialization,
  isTechlead: manager.is_techlead,
  permissions: activePermissions.map((p) => ({
    scope: p.scope,
    specialization: p.specialization,
  })),
};
      return res.status(201).json({
        message: "Manager created/updated successfully",
        data: response,
      });
    } catch (error) {
      this.logger.error(`upsertManager error: ${error?.message}`, error?.stack);
      await queryRunner.rollbackTransaction();
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to upsert manager: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async getAllManagers(
    header: BaseHeaderDTO,
    query: FindAllManagersQueryDto,
    res: Response,
  ): Promise<Response> {
    try {
      this.logger.log(
        `getAllManagers called header=${JSON.stringify(
          header,
        )} query=${JSON.stringify(query)}`,
      );
      const { page, size, active, direction } = header;
      const { search, isCc, departmentName, specialization } = query;
      const paginate = new PageRequest(page, size, `${active},${direction}`);

      const queryBuilder = this.dataSource
        .getRepository(RecruitmentManager)
        .createQueryBuilder("manager")
        .leftJoinAndSelect(
          "manager.managerPermissions",
          "perm",
          "perm.is_active = 1",
        );

      // Filter by search (name or email)
      if (search) {
        queryBuilder.andWhere(
          "(manager.name LIKE :search OR manager.email LIKE :search)",
          { search: `%${search}%` },
        );
      }

      // Filter by is_cc (expecting 0 or 1 from FE)
      if (isCc !== undefined && isCc !== null) {
        queryBuilder.andWhere("manager.is_cc = :isCc", {
          isCc,
        });
      }

      // Filter by department_name (supports multiple values separated by comma)
      if (departmentName) {
        const departments = departmentName
          .split(",")
          .map((d) => d.trim())
          .filter((d) => d);
        if (departments.length > 0) {
          queryBuilder.andWhere(
            "manager.department_name IN (:...departments)",
            {
              departments,
            },
          );
        }
      }

      // Filter by specialization
      if (specialization) {
        queryBuilder.andWhere("manager.specialization LIKE :specialization", {
          specialization: `%${specialization}%`,
        });
      }

      // Apply sorting
      const sortField = active || "id";
      const sortDirection =
        direction?.toUpperCase() === SORT.ASC ? SORT.ASC : SORT.DESC;
      queryBuilder.orderBy(`manager.${sortField}`, sortDirection);

      // Get total count
      const total = await queryBuilder.getCount();

      // Apply pagination
      queryBuilder.skip(paginate.skip).take(paginate.size);

      const managers = await queryBuilder.getMany();
      this.logger.debug(`getAllManagers retrieved ${managers.length} managers`);

      const response: ManagerResponseDTO[] = managers.map((manager) => ({
        id: manager.id,
        name: manager.name,
        email: manager.email,
        isCc: manager.is_cc === 1,
        departmentName: manager.department_name,
        specialization: manager.specialization,
        isTechlead: manager.is_techlead,
permissions: (manager.managerPermissions ?? []).map((p) => ({
  scope: p.scope,
  specialization: p.specialization,
})),
      }));

      const result = handleResPagination(
        response,
        total,
        paginate.page,
        paginate.size,
      );

      return res.status(200).json(result);
    } catch (error) {
      this.logger.error(
        `getAllManagers error: ${error?.message}`,
        error?.stack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve managers: ${error.message}`,
      );
    }
  }

  async findMailManagerByDepartments(
    departmentNames: string[],
  ): Promise<RecruitmentManager | null> {
    const manager = await this.dataSource
      .getRepository(RecruitmentManager)
      .createQueryBuilder("manager")
      .where("manager.department_name IN (:...departmentNames)", {
        departmentNames,
      })
      .getOne();
    return manager;
  }

  async findMailManagersByDepartments(departmentNames: string[]) {
    const managers = await this.dataSource
      .getRepository(RecruitmentManager)
      .createQueryBuilder("manager")
      .where("manager.department_name IN (:...departmentNames)", {
        departmentNames,
      })
      .getMany();
    return managers;
  }

  async getManagerById(id: number, res: Response): Promise<Response> {
    try {
      this.logger.log(`getManagerById id=${id}`);
      const manager = await this.dataSource
        .getRepository(RecruitmentManager)
        .findOne({
          where: { id },
        });

      if (!manager) {
        this.logger.warn(`Manager with ID ${id} not found`);
        throw new NotFoundException(`Manager with ID ${id} not found`);
      }

const activePermissions = await this.dataSource
  .getRepository(RecruitmentManagerPermission)
  .createQueryBuilder('perm')
  .where('perm.manager_id = :managerId', { managerId: manager.id })
  .andWhere('perm.is_active = 1')
  .getMany();

const response: ManagerResponseDTO = {
  id: manager.id,
  name: manager.name,
  email: manager.email,
  isCc: manager.is_cc === 1,
  departmentName: manager.department_name,
  specialization: manager.specialization,
  isTechlead: manager.is_techlead,
  permissions: activePermissions.map((p) => ({
    scope: p.scope,
    specialization: p.specialization,
  })),
};
      return res.status(200).json({
        message: "Manager retrieved successfully",
        data: response,
      });
    } catch (error) {
      this.logger.error(
        `getManagerById error: ${error?.message}`,
        error?.stack,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to retrieve manager: ${error.message}`,
      );
    }
  }

  async getCandidatesByManagersGroupedByStatus(
    query: FindAllCandidatesByManagerQueryDTO,
    res: Response,
  ): Promise<Response> {
    try {
      this.logger.log(
        `getCandidatesByManagersGroupedByStatus query=${JSON.stringify(query)}`,
      );
      const { email, departmentName } = query;

      // Build base query to get managers
      const managerQueryBuilder = this.dataSource
        .getRepository(RecruitmentManager)
        .createQueryBuilder("manager");

      // Filter by email if provided
      if (email) {
        managerQueryBuilder.where("manager.email = :email", { email });
      }

      // Filter by department_name if provided
      if (departmentName) {
        const departments = departmentName
          .split(",")
          .map((d) => d.trim())
          .filter((d) => d);
        if (departments.length > 0) {
          managerQueryBuilder.andWhere(
            "manager.department_name IN (:...departments)",
            { departments },
          );
        }
      }

      const managers = await managerQueryBuilder.getMany();
      this.logger.debug(`Found ${managers.length} managers for criteria`);

      if (!managers || managers.length === 0) {
        return res.status(200).json({
          message: "No managers found",
          data: [],
        });
      }

      // Extract department names and specializations from managers
      const managerDepartments = [
        ...new Set(managers.map((m) => m.department_name).filter((d) => d)),
      ];

      // Extract all specializations from managers and split by comma
      const managerSpecializations = [
        ...new Set(
          managers
            .map((m) => m.specialization)
            .filter((s) => s)
            .flatMap((s) => s.split(",").map((spec) => spec.trim()))
            .filter((s) => s),
        ),
      ];

      if (managerDepartments.length === 0) {
        return res.status(200).json({
          message: "Managers have no departments",
          data: [],
        });
      }

      // Build WHERE clause for departments
      // Since app.department can contain multiple departments separated by comma
      // We need to check if any manager department is in the app.department list
      const departmentConditions = managerDepartments
        .map(
          (dept) =>
            `FIND_IN_SET(:dept${managerDepartments.indexOf(
              dept,
            )}, REPLACE(app.department, ' ', ''))`,
        )
        .join(" OR ");

      const departmentParams = {};
      managerDepartments.forEach((dept, index) => {
        departmentParams[`dept${index}`] = dept;
      });

      // app.position now stores order.id
      // manager.specialization stores position names (e.g. "Unity Developer, 2D Artist")
      // We need to find all order IDs where order.position matches any specialization
      let matchingOrderIds: number[] = [];
      if (managerSpecializations.length > 0) {
        const orderQueryBuilder = this.dataSource
          .getRepository("recruitment_order")
          .createQueryBuilder("ord")
          .where("ord.deleted_at IS NULL");

        const specConditions = managerSpecializations
          .map((spec, index) => {
            return `ord.position LIKE :ordSpec${index}`;
          })
          .join(" OR ");

        const specParams = {};
        managerSpecializations.forEach((spec, index) => {
          specParams[`ordSpec${index}`] = `%${spec}%`;
        });

        orderQueryBuilder.andWhere(`(${specConditions})`, specParams);

        const matchingOrders = await orderQueryBuilder
          .select(["ord.id", "ord.position"])
          .getMany();

        matchingOrderIds = matchingOrders.map((o) => o.id);
      }

      // Query to get candidates grouped by result
      const queryBuilder = this.dataSource
        .getRepository("recruitment_applications")
        .createQueryBuilder("app")
        .innerJoinAndSelect("app.candidate", "candidate")
        .leftJoinAndSelect("app.cvs", "cv")
        .innerJoin(
          "recruitment_candidate_pipeline",
          "pipeline",
          "pipeline.application_id = app.id AND pipeline.candidate_id = app.candidateId",
        )
        // Left join order table to get position name (app.position = order.id)
        .leftJoin(
          "recruitment_order",
          "ord",
          "ord.id = CAST(app.position AS UNSIGNED)",
        )
        .addSelect("ord.position", "orderPositionName")
        .where(`(${departmentConditions})`, departmentParams);

      // Filter by matching order IDs (specialization filter)
      if (matchingOrderIds.length > 0) {
        queryBuilder.andWhere(
          "CAST(app.position AS UNSIGNED) IN (:...orderIds)",
          { orderIds: matchingOrderIds },
        );
      }

      queryBuilder
        .andWhere("app.test_online_status = :testStatus", {
          testStatus: TestOnlineStatus.PASSED,
        })
        .andWhere("app.deletedAt IS NULL")
        .andWhere("candidate.deletedAt IS NULL")
        .select([
          "app.id",
          "app.candidateId",
          "app.position",
          "app.level",
          "app.department",
          "app.source",
          "app.appliedDate",
          "app.status",
          "app.testOnlineStatus",
          "app.note",
          "app.iqTest",
          "app.techTest",
          "app.thinkingTest",
          "app.createdAt",
          "app.updatedAt",
          "app.gpa",
          "candidate.id",
          "candidate.fullName",
          "candidate.email",
          "candidate.phone",
          "candidate.gender",
          "candidate.universitySchool",
          "candidate.birthday",
          "cv.id",
          "cv.filePath",
          "cv.productLinks",
          "cv.createdAt",
          "pipeline.id",
          "pipeline.result",
          "pipeline.recruitmentPipelineCode",
          "pipeline.startTime",
          "pipeline.endTime",
          "pipeline.note",
        ])
        .addSelect("pipeline.result", "pipeline_result")
        .addSelect("ord.position", "orderPositionName");

      const rawAndEntities = await queryBuilder.getRawAndEntities();
      const results = rawAndEntities.entities;

      // Build a map from app.id to order position name from raw results
      const orderPositionMap = new Map<number, string>();
      for (const raw of rawAndEntities.raw) {
        if (raw.app_id && raw.orderPositionName) {
          orderPositionMap.set(raw.app_id, raw.orderPositionName);
        }
      }

      // Group results by 4 categories based on review table
      const groupedByResult = {
        needReview: [], // CV cần đánh giá
        waitingInterview: [], // CV chờ phỏng vấn
        hired: [], // CV nhận việc
        rejected: [], // CV bị loại
      };

      for (const app of results) {
        // Get pipeline history for this application to get notes
        const pipelineHistory = await this.dataSource
          .getRepository("recruitment_candidate_pipeline")
          .createQueryBuilder("pipeline")
          .where("pipeline.application_id = :appId", { appId: app.id })
          .andWhere("pipeline.candidate_id = :candidateId", {
            candidateId: app.candidateId,
          })
          .andWhere("pipeline.recruitment_pipeline_code = :appStatus", {
            appStatus: RECRUITMENT_PIPELINE_CODES.IQ_TEST,
          })
          .orderBy("pipeline.created_at", "DESC")
          .getMany();

        // Get the candidate's review records
        const reviewRecords = await this.dataSource
          .getRepository(RecruitmentCandidateManagerReview)
          .createQueryBuilder("review")
          .where("review.application_id = :appId", { appId: app.id })
          .orderBy("review.created_at", "DESC")
          .getMany();

        const candidateData = {
          applicationId: app.id,
          candidateId: app.candidate.id,
          fullName: app.candidate.fullName,
          email: app.candidate.email,
          phone: app.candidate.phone,
          gender: app.candidate.gender,
          universitySchool: app.candidate.universitySchool,
          position: orderPositionMap.get(app.id) || app.position,
          orderId: app.position,
          level: app.level,
          department: app.department,
          source: app.source,
          appliedDate: app.appliedDate,
          status: app.status,
          testOnlineStatus: app.testOnlineStatus,
          note: app.note,
          gpa: app.gpa,
          productLinks:
            app.cvs && app.cvs.length > 0 ? app.cvs[0].productLinks : null,
          birthday: app.candidate.birthday,
          iqTest: app.iqTest,
          techTest: app.techTest,
          thinkingTest: app.thinkingTest,
          cvPath: app.cvs && app.cvs.length > 0 ? app.cvs[0].filePath : null,
          reviewManager:
            reviewRecords.length > 0
              ? reviewRecords.map((r) => ({
                  reviewerId: r.reviewer_id,
                  pipelineCode: r.pipeline_code,
                  status: r.status,
                  note: r.note,
                  reviewedAt: r.reviewed_at,
                }))
              : null,
          pipelineHistory: pipelineHistory.map((p) => ({
            id: p.id,
            recruitmentPipelineCode: p.recruitmentPipelineCode,
            result: p.result,
            startTime: p.startTime,
            endTime: p.endTime,
            note: p.note,
          })),
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
        };

        // Categorize candidate based on latest review records
        categorizeCandidateByReviewStatus(
          reviewRecords,
          candidateData,
          groupedByResult,
          managers.map((m) => m.id),
        );
      }

      return res.status(200).json({
        message: "Candidates retrieved successfully",
        data: {
          managers: managers.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            departmentName: m.department_name,
          })),
          candidates: {
            needReview: groupedByResult.needReview,
            waitingInterview: groupedByResult.waitingInterview,
            hired: groupedByResult.hired,
            rejected: groupedByResult.rejected,
          },
          summary: {
            totalNeedReview: groupedByResult.needReview.length,
            totalWaitingInterview: groupedByResult.waitingInterview.length,
            totalHired: groupedByResult.hired.length,
            totalRejected: groupedByResult.rejected.length,
            total:
              groupedByResult.needReview.length +
              groupedByResult.waitingInterview.length +
              groupedByResult.hired.length +
              groupedByResult.rejected.length,
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `getCandidatesByManagersGroupedByStatus error: ${error?.message}`,
        error?.stack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve candidates by managers: ${error.message}`,
      );
    }
  }

  /**
   * Create a candidate review by manager
   * If status is APPROVE, automatically update candidate to DEPARTMENT_REVIEW
   */
  async createCandidateReview(
    createReviewDto: CreateCandidateReviewDTO,
    email: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(
        `createCandidateReview start application=${createReviewDto.application_id} reviewerEmail=${email}`,
      );
      // Get reviewer (manager) ID by email
      const manager = await queryRunner.manager.findOne(
        RecruitmentManager,
        {
          where: { email },
        },
      );

      if (!manager) {
        throw new NotFoundException(
          `Reviewer (manager) with email ${email} not found`,
        );
      }

      const userId = manager.id;

      // 1. Upsert the review record
      const reviewData = {
        id: null,
        application_id: createReviewDto.application_id,
        pipeline_code: createReviewDto.pipeline_code,
        reviewer_id: userId,
        status: createReviewDto.status,
        note: createReviewDto.note || null,
        reviewed_at: new Date(),
      };

      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(RecruitmentCandidateManagerReview)
        .values(reviewData)
        .orUpdate(
          ["status", "note", "reviewed_at"], // columns to update on duplicate
          ["application_id", "pipeline_code", "reviewer_id"], // conflict target (unique columns)
        )
        .execute();

      // 2. If status is APPROVE, update candidate status to DEPARTMENT_REVIEW
      if (
        createReviewDto.status === ReviewStatus.APPROVE &&
        createReviewDto.pipeline_code ===
          RECRUITMENT_PIPELINE_CODES.DEPARTMENT_REVIEW
      ) {
        // Get the application to find candidateId
        const application = await queryRunner.manager.query(
          `SELECT candidate_id FROM recruitment_applications WHERE id = ?`,
          [createReviewDto.application_id],
        );

        if (application && application.length > 0) {
          const candidateId = application[0].candidate_id;

          // Fetch the latest application for this candidate
          const latestApplication = await queryRunner.manager.query(
            `SELECT id FROM recruitment_applications WHERE candidate_id = ? ORDER BY id DESC LIMIT 1`,
            [candidateId],
          );

          if (latestApplication && latestApplication.length > 0) {
            const appId = latestApplication[0].id;

            // Get current active pipeline (if exists) to close it
            const currentPipeline = await queryRunner.manager.query(
              `SELECT id, recruitment_pipeline_code FROM recruitment_candidate_pipeline 
               WHERE application_id = ? AND end_time IS NULL LIMIT 1`,
              [appId],
            );

            if (currentPipeline && currentPipeline.length > 0) {
              // Close the current pipeline
              await queryRunner.manager.query(
                `UPDATE recruitment_candidate_pipeline 
                 SET end_time = NOW(), result = ? 
                 WHERE id = ?`,
                [PIPELINE_RESULT.PASS, currentPipeline[0].id],
              );
            }

            // Create new pipeline history entry for DEPARTMENT_REVIEW only if not already exists
            const blockedCodes = [
              RECRUITMENT_PIPELINE_CODES.DEPARTMENT_REVIEW,
              RECRUITMENT_PIPELINE_CODES.TECHNICAL_TEST,
              RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_1,
              RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_2,
              RECRUITMENT_PIPELINE_CODES.OFFER,
              RECRUITMENT_PIPELINE_CODES.ONBOARDING,
              RECRUITMENT_PIPELINE_CODES.FAIL,
            ];
            const existingPipeline = await queryRunner.manager.query(
              `SELECT id FROM recruitment_candidate_pipeline 
               WHERE application_id = ? AND recruitment_pipeline_code IN (?) LIMIT 1`,
              [appId, blockedCodes],
            );

            if (!existingPipeline || existingPipeline.length === 0) {
              await queryRunner.manager.query(
                `INSERT INTO recruitment_candidate_pipeline 
                 (candidate_id, application_id, recruitment_pipeline_code, start_time, result, note, created_by) 
                 VALUES (?, ?, ?, NOW(), ?, ?, ?)`,
                [
                  candidateId,
                  appId,
                  createReviewDto.pipeline_code,
                  PIPELINE_RESULT.PENDING,
                  `Approved by manager review ${userId}`,
                  userId,
                ],
              );

              // Update application status
              await queryRunner.manager.query(
                `UPDATE recruitment_applications 
               SET status = ? 
               WHERE id = ?`,
                [createReviewDto.pipeline_code, appId],
              );
            }
          }
        }
      }

      await queryRunner.commitTransaction();
      this.logger.log(
        `createCandidateReview committed application=${createReviewDto.application_id}`,
      );

      // Send socket notification when status is APPROVE or REJECT
      if (
        [ReviewStatus.APPROVE, ReviewStatus.REJECT].includes(
          createReviewDto.status,
        )
      ) {
        const result = await this.dataSource.query(
          `
    SELECT c.full_name
    FROM recruitment_applications a
    JOIN recruitment_candidates c ON c.id = a.candidate_id
    WHERE a.id = ?
    `,
          [createReviewDto.application_id],
        );

        const candidateName = result?.[0]?.full_name ?? "ứng viên";

        const roomName = `recruitment_${RoleType.RECRUITMENT_MANAGEMENT}`;

        const statusMessage = {
          [ReviewStatus.APPROVE]: {
            title: "Đã phê duyệt ứng viên",
            body: `Ứng viên ${candidateName} đã được phê duyệt bởi ${manager.email}`,
          },
          [ReviewStatus.REJECT]: {
            title: "Đã loại ứng viên",
            body: `Ứng viên ${candidateName} đã bị loại bởi ${manager.email}`,
          },
        };

        const { title, body } = statusMessage[createReviewDto.status];

       // this.socketGateway.notifyRoomAndSave(roomName, title, body);
       // this.logger.log(
       //   `Sent socket notification to room "${roomName}" for application #${createReviewDto.application_id} with status=${createReviewDto.status}`,
       // );
      }
    } catch (error) {
      console.log(1111, error);
      this.logger.error(
        `createCandidateReview error: ${error?.message}`,
        error?.stack,
      );
      await queryRunner.rollbackTransaction();

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Failed to create candidate review",
      });
    } finally {
      await queryRunner.release();
    }
  }

  // only for do a statistic for role recruitment manager
  async updateStatusLatestCandidateReview(
    applicationId: number,
    body: UpdateCandidateReviewStatusDTO,
    email: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(
        `updateStatusLatestCandidateReview start applicationId=${applicationId} body=${JSON.stringify(
          body,
        )}`,
      );
      const { status, note } = body;

      // Get reviewer (manager) ID by email
      const manager = await queryRunner.manager.findOne(
        RecruitmentManager,
        {
          where: { email },
        },
      );

      if (!manager) {
        throw new NotFoundException(
          `Reviewer (manager) with email ${email} not found`,
        );
      }

      // get the latest review record
      const latestReview = await queryRunner.manager.findOne(
        RecruitmentCandidateManagerReview,
        {
          where: { application_id: applicationId, reviewer_id: manager.id },
          order: { created_at: "DESC" },
        },
      );

      if (!latestReview) {
        await queryRunner.commitTransaction();
        return;
      }

      const REVIEW_PIPELINES = new Set<string>([
        RECRUITMENT_PIPELINE_CODES.DEPARTMENT_REVIEW,
        RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_1,
        RECRUITMENT_PIPELINE_CODES.ONBOARDING,
      ]);

      // Pipeline không thuộc nhóm cần update => skip
      if (!REVIEW_PIPELINES.has(latestReview.pipeline_code)) {
        await queryRunner.commitTransaction();
        return;
      }

      // Update đúng 1 record mới nhất
      if (latestReview.status !== status) {
        await queryRunner.manager.update(
          RecruitmentCandidateManagerReview,
          { id: latestReview.id },
          { status, note },
        );
        this.logger.debug(
          `updateStatusLatestCandidateReview updated reviewId=${latestReview.id} to status=${status}`,
        );
      }

      await queryRunner.commitTransaction();
      this.logger.log(
        `updateStatusLatestCandidateReview committed applicationId=${applicationId}`,
      );
    } catch (error) {
      this.logger.error(
        `updateStatusLatestCandidateReview error: ${error?.message}`,
        error?.stack,
      );
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  async updateStatusCandidateReview(
    applicationId: number,
    pipelineCode: string[],
    statusCompare: ReviewStatus[],
    statusUpdate: ReviewStatus,
  ) {
    try {
      const result = await this.dataSource
        .getRepository(RecruitmentCandidateManagerReview)
        .createQueryBuilder()
        .update()
        .set({ status: statusUpdate })
        .where("application_id = :applicationId", { applicationId })
        .andWhere("pipeline_code IN (:...pipelineCode)", { pipelineCode })
        .andWhere("status IN (:...statusCompare)", { statusCompare })
        .execute();

      this.logger.log(
        `updateStatusCandidateReview applicationId=${applicationId} pipelineCode=${pipelineCode} ${statusCompare} → ${statusUpdate} | affected=${result.affected}`,
      );
    } catch (error) {
      this.logger.error(
        `updateStatusCandidateReview error: ${error?.message}`,
        error?.stack,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to update candidate review: ${error.message}`,
      );
    }
  }

  async getMyCandidates(
    email: string,
    header: BaseHeaderDTO,
    query: GetMyCandidatesQueryDto,
    res: Response,
  ): Promise<Response> {
    try {
      this.logger.log(`getMyCandidates start email=${email}`);
      const { fullname, startDate, endDate } = query || {};
      const { page, size, active, direction } = header;
      const paginate = new PageRequest(page, size, `${active},${direction}`);

      // Find the manager by email
      const manager = await this.dataSource
        .getRepository(RecruitmentManager)
        .findOne({ where: { email } });

      if (!manager) {
        throw new NotFoundException(`Manager with email ${email} not found`);
      }

      // Build the query
      let queryBuilder = this.dataSource
        .createQueryBuilder()
        .select([
          "c.id AS candidate_id",
          "c.full_name AS full_name",
          "c.phone AS phone",
          "c.email AS candidate_email",
          "c.gender AS gender",
          "c.university_school AS university_school",
          "c.birthday AS birthday",
          "a.id AS application_id",
          "a.position AS position",
          "a.level AS level",
          "a.department AS department",
          "a.source AS source",
          "a.applied_date AS applied_date",
          "a.status AS status",
          "a.note AS application_note",
          "a.onboarding_date AS onboarding_date",
          "a.test_online_status AS test_online_status",
          "a.gpa AS gpa",
          "a.iq_test AS iq_test",
          "a.tech_test AS tech_test",
          "a.thinking_test AS thinking_test",
          "o.id AS order_id",
          "o.team AS order_team",
          "o.position AS order_position",
          "o.status AS order_status",
          "o.hr_level AS order_hr_level",
          "cv.file_path AS cv_file_path",
          "cv.product_links AS cv_product_links",
        ])
        .from("recruitment_candidates", "c")
        .innerJoin(
          "recruitment_applications",
          "a",
          "a.candidate_id = c.id AND a.deleted_at IS NULL",
        )
        .leftJoin(
          "recruitment_candidates_cv",
          "cv",
          "cv.application_id = a.id",
        )
        .leftJoin(
          "recruitment_order",
          "o",
          "o.id = CAST(a.position AS UNSIGNED) AND o.deleted_at IS NULL",
        )
        .where("c.deleted_at IS NULL");

      if (fullname) {
        queryBuilder = queryBuilder.andWhere(
          "(c.full_name LIKE :fullname OR o.position LIKE :fullname)",
          {
            fullname: `%${fullname}%`,
          },
        );
      }

      if (startDate) {
        queryBuilder = queryBuilder.andWhere("a.applied_date >= :startDate", {
          startDate,
        });
      }

      if (endDate) {
        queryBuilder = queryBuilder.andWhere("a.applied_date <= :endDate", {
          endDate,
        });
      }

      if (manager.is_techlead) {
        // is_techlead = "Tester_1" → extract position prefix "Tester"
        const techleadPosition = manager.is_techlead.replace(/_\d+$/, "");
        // Techlead can see all candidates where order.position matches, regardless of department
        queryBuilder = queryBuilder.andWhere(
          "o.position LIKE :techleadPosition",
          {
            techleadPosition: `%${techleadPosition}%`,
          },
        );
      } else {
        // Normal manager: filter by department and specialization
        const conditions: string[] = [];
        const params: Record<string, any> = {};

        if (manager.department_name) {
          const departments = manager.department_name
            .split(",")
            .map((d) => d.trim())
            .filter((d) => d);
          if (departments.length > 0) {
            // application.department can have multiple values like "Data, HR"
            const deptConditions = departments.map((dept, i) => {
              params[`dept_${i}`] = `%${dept}%`;
              return `a.department LIKE :dept_${i}`;
            });
            conditions.push(`(${deptConditions.join(" OR ")})`);
          }
        }

        if (manager.specialization) {
          const specializations = manager.specialization
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s);
          if (specializations.length > 0) {
            const specConditions = specializations.map((spec, i) => {
              params[`spec_${i}`] = `%${spec}%`;
              return `o.position LIKE :spec_${i}`;
            });
            conditions.push(`(${specConditions.join(" OR ")})`);
          }
        }

        if (conditions.length > 0) {
          queryBuilder = queryBuilder.andWhere(
            conditions.join(" AND "),
            params,
          );
        }
      }

      // Get total count
      const total = await queryBuilder.getCount();

      // Sorting
      const sortField = active || "a.id";
      const sortDirection =
        direction?.toUpperCase() === SORT.ASC ? SORT.ASC : SORT.DESC;
      queryBuilder
        .orderBy(sortField, sortDirection)
        .offset(paginate.skip)
        .limit(paginate.size);

      const candidates = await queryBuilder.getRawMany();
      this.logger.debug(
        `getMyCandidates found ${candidates.length} candidates for email=${email}`,
      );

      const result = handleResPagination(
        candidates,
        total,
        paginate.page,
        paginate.size,
      );

      return res.status(200).json(result);
    } catch (error) {
      this.logger.error(
        `getMyCandidates error: ${error?.message}`,
        error?.stack,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to retrieve candidates: ${error.message}`,
      );
    }
  }
}
