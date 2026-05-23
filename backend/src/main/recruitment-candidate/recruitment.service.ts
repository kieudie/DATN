import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Response } from "express";
import { DataSource } from "typeorm";
import { MESSAGE } from "../../common/constants/constants";
import {
  PIPELINE_RESULT,
  RECRUITMENT_PIPELINE_CODES,
  TestOnlineStatus
} from "../../common/constants/recruitment.constants";
import { handleResPagination } from "../../common/functions/paginate";
import { LoggerService } from "../../common/logger/logger.service";
import { PageRequest } from "../../entities/base/pagination.entity";
import { RecruitmentOrder } from "../../entities/recruitment-order";
import { BaseHeaderDTO } from "../base/base.header";
import { EmailTemplateService } from "../mail-recruitment/email-template.service";
import { MailRecruitmentService } from "../mail-recruitment/mail-recruitment.service";
import { ScheduledJobService } from "../scheduled-job/scheduled-job.service";
import { ApplicationService } from "./application/application.service";
import { CandidateCvService } from "./candidate-cv/candidate-cv.service";
import { CandidatePipelineService } from "./candidate-pipeline/candidate-pipeline.service";
import { CandidateService } from "./candidate/candidate.service";
import {
  CandidateApplicationHistoryDTO,
  CheckCandidateResponseDTO,
} from "./dto/check-candidate-response.dto";
import { CheckCandidateDTO } from "./dto/check-candidate.dto";
import { CreateCandidateDTO } from "./dto/create-candidate.dto";
import { FindAllCandidatesQueryDto } from "./dto/find-all-candidates-query.dto";
import { GetCandidatesPagedQueryDto } from "./dto/get-candidates-paged-query.dto";
import { GroupedCandidatesQueryDto } from "./dto/grouped-candidates-query.dto";
import { MailRecruitmentDTO } from "./dto/mail-recruitment.dto";
import { PipelineStageDTO } from "./dto/pipeline-stage.dto";
import { UpdateApplicationDTO } from "./dto/update-application.dto";
import { UpdateCandidateStatusDTO } from "./dto/update-candidate-status.dto";
import { UpdateCandidateDTO } from "./dto/update-candidate.dto";
import { normalizeCc } from "./helper/recruitment.helper";
import { PipelineService } from "./pipeline/pipeline.service";
@Injectable()
export class RecruitmentService {
  private readonly logger = new LoggerService("RecruitmentService");

  constructor(
    private readonly candidateService: CandidateService,
    private readonly applicationService: ApplicationService,
    private readonly candidateCvService: CandidateCvService,
    private readonly candidatePipelineService: CandidatePipelineService,
    private readonly pipelineService: PipelineService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly mailRecruitmentService: MailRecruitmentService,
    private readonly scheduledJobService: ScheduledJobService,
    private dataSource: DataSource,
  ) {}

  async createCandidate(
    createCandidateDto: CreateCandidateDTO,
    userId: number,
    res: Response,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Check if candidate exists (by email)
      let candidate = await this.candidateService.findByEmail(
        createCandidateDto.email,
      );

      // 2. Create candidate if not exists
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
        this.logger.log(
          `Created new candidate with email: ${createCandidateDto.email}`,
        );
      } else {
        this.logger.log(
          `Candidate already exists with email: ${createCandidateDto.email}, creating new application`,
        );
      }

      // 3. Create new application for this candidate
      const applicationEntity = this.applicationService.createEntity({
        candidateId: candidate.id,
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
      this.logger.log(
        `Created application id: ${application.id} for candidate: ${candidate.id}`,
      );

      // 4. Create CV if filePath provided
      if (createCandidateDto.filePath) {
        const cvEntity = this.candidateCvService.createEntity({
          candidateId: candidate.id,
          applicationId: application.id,
          filePath: createCandidateDto.filePath,
          productLinks: createCandidateDto.productLinks,
        });
        await queryRunner.manager.save(cvEntity);
        this.logger.log(`Created CV for application: ${application.id}`);
      }

      // 5. Create initial pipeline history
      const pipelineEntity = this.candidatePipelineService.createEntity({
        candidateId: candidate.id,
        applicationId: application.id,
        recruitmentPipelineCode:
          createCandidateDto.status || RECRUITMENT_PIPELINE_CODES.RECEIVED_CV,
        startTime: new Date(),
        result: PIPELINE_RESULT.PENDING,
        createdBy: userId,
      });
      await queryRunner.manager.save(pipelineEntity);
      this.logger.log(
        `Created initial pipeline history for application: ${application.id}`,
      );

      await queryRunner.commitTransaction();

      // Fetch the complete result with relations
      const result = await this.applicationService.findByIdWithRelations(
        application.id,
      );

      return res.status(200).json(result);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.log(`Error creating candidate: ${error.message}`);

      if (error instanceof ConflictException) {
        throw error;
      }

      throw new InternalServerErrorException(
        "Failed to create candidate. Please try again.",
      );
    } finally {
      await queryRunner.release();
    }
  }

  async findCandidateById(id: number, res: Response) {
    try {
      const candidate = await this.candidateService.findByIdWithRelations(id);

      return res.status(200).json(candidate);
    } catch (error) {
      this.logger.log(`Error finding candidate: ${error.message}`);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        "Failed to find candidate. Please try again.",
      );
    }
  }

  async findAllCandidates(
    header: BaseHeaderDTO,
    query: FindAllCandidatesQueryDto,
    res: Response,
  ) {
    try {
      const { page, size, active, direction } = header;
      const paginate = new PageRequest(page, size, `${active},${direction}`);

      const [data, total] = await this.candidateService.findAll(header, query);

      this.logger.log(
        `Retrieved ${total} candidates with filters (page: ${header.page}, size: ${header.size})`,
      );

      const result = handleResPagination(
        data,
        total,
        paginate.page,
        paginate.size,
      );
      return res.status(200).json(result);
    } catch (error) {
      this.logger.log(`Error finding all candidates: ${error.message}`);

      throw new InternalServerErrorException(
        "Failed to retrieve candidates. Please try again.",
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

      this.logger.log(`Updated candidate with ID: ${candidateId}`);

      const result = await this.candidateService.findByIdWithRelations(
        candidateId,
      );

      return res.status(200).json(result);
    } catch (error) {
      this.logger.log(`Error updating candidate: ${error.message}`);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        "Failed to update candidate. Please try again.",
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
      const toTinyInt = (value: number | boolean | undefined) =>
        value === undefined ? undefined : Number(value);

      // 1. Get application to get candidateId and old status
      const application = await this.applicationService.findById(applicationId);

      if (!application) {
        throw new NotFoundException(
          `Application with ID ${applicationId} not found`,
        );
      }

      // 2. Update application basic info (excluding status)
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

      this.logger.log(`Updated application with ID: ${applicationId}`);

      // 3. If filePath is provided, update or create CV
      if (updateApplicationDto.filePath) {
        await this.candidateCvService.updateOrCreateByApplicationId(
          application.id,
          application.candidateId,
          updateApplicationDto.filePath,
          updateApplicationDto.productLinks,
        );
      }

      // 4. If testOnlineStatus = TestOnlineStatus.PASS, add a record to recruitment candidate manager review with status pending, using recruitmentManagerService.createCandidateReview
      // if (
      //   updateApplicationDto.testOnlineStatus === TestOnlineStatus.PASSED &&
      //   application.status === RECRUITMENT_PIPELINE_CODES.IQ_TEST
      // ) {
      //   const departmentNames = application.department
      //     .split(",")
      //     .map((d) => d.trim());
      //   const mailManagers =
      //     await this.recruitmentManagerService.findMailManagersByDepartments(
      //       departmentNames,
      //     );

      //   if (!mailManagers || mailManagers.length === 0) {
      //     throw new NotFoundException(
      //       `Mail manager not found for departments: ${departmentNames.join(
      //         ", ",
      //       )}`,
      //     );
      //   }

      //   for (const manager of mailManagers) {
      //     this.logger.log(
      //       `Found mail manager ${
      //         manager.email
      //       } for department(s): ${departmentNames.join(", ")}`,
      //     );

      //     await this.recruitmentManagerService.createCandidateReview(
      //       {
      //         application_id: application.id,
      //         pipeline_code: RECRUITMENT_PIPELINE_CODES.DEPARTMENT_REVIEW,
      //         status: ReviewStatus.PENDING,
      //       },
      //       manager.email,
      //     );
      //   }

      //   // Get candidate name for notification
      //   const candidate = await this.candidateService.findById(
      //     application.candidateId,
      //   );

      //   // Look up the order's position name (used as specialization for room targeting)
      //   const orderRows: { position: string }[] = await this.dataSource.query(
      //     `SELECT position FROM rocket_recruitment_order WHERE id = ? LIMIT 1`,
      //     [application.position],
      //   );
      //   const orderPosition = orderRows?.[0]?.position?.trim() || "";

      //   // Build targeted rooms: recruitment_manager_{dept}_{orderPosition}
      //   const notifyRooms: string[] = orderPosition
      //     ? departmentNames.map((dept) =>
      //         SocketGateway.buildManagerRoom(dept, orderPosition),
      //       )
      //     : [`recruitment_${RoleType.RECRUITMENT_MANAGER}`]; // fallback to generic

      //   // Narrow to managers whose specialization includes the order position
      //   const targetManagers =
      //     orderPosition && mailManagers.some((m) => m.specialization)
      //       ? mailManagers.filter((m) => {
      //           if (!m.specialization) return true;
      //           const specs = m.specialization
      //             .split(",")
      //             .map((s) => s.trim().toLowerCase());
      //           const pos = orderPosition.toLowerCase();
      //           return specs.some(
      //             (spec) => spec.includes(pos) || pos.includes(spec),
      //           );
      //         })
      //       : mailManagers;

      //   const targetEmails = (
      //     targetManagers.length > 0 ? targetManagers : mailManagers
      //   ).map((m) => m.email);

      //   this.socketGateway.notifyManagersAndSave(
      //     notifyRooms,
      //     "Yêu cầu đánh giá ứng viên mới",
      //     `${candidate.fullName} đang chờ bạn phản hồi đánh giá`,
      //     targetEmails,
      //   );
      //   this.logger.log(
      //     `Sent socket notification to rooms=[${notifyRooms.join(
      //       ", ",
      //     )}] for application #${application.id} test online passed`,
      //   );
      // }

      await queryRunner.commitTransaction();

      // Fetch the complete result with relations
      const result = await this.applicationService.findByIdWithRelations(
        application.id,
      );

      return res.status(200).json(result);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.log(`Error updating application: ${error.message}`);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        "Failed to update application. Please try again.",
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update candidate status and create pipeline history
   */
  async updateCandidateStatus(
    candidateId: number,
    updateStatusDto: UpdateCandidateStatusDTO,
    userId: number,
    res: Response,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let transactionCommitted = false;

    try {
      // 1. Check if candidate exists
      const candidate = await this.candidateService.findById(candidateId);
      if (!candidate) {
        throw new NotFoundException(
          `Candidate with ID ${candidateId} not found`,
        );
      }

      // 2. Get the latest application for this candidate
      const latestApplication =
        await this.applicationService.findLatestByCandidateId(candidateId);
      if (!latestApplication) {
        throw new NotFoundException(
          `No application found for candidate ID ${candidateId}`,
        );
      }

      // 3. Get current active pipeline (if exists) to close it
      const currentPipeline =
        await this.candidatePipelineService.findActivePipelineByApplicationId(
          latestApplication.id,
        );

      // 3.a. Enforce pipeline order: ensure new status has higher order than previous
      // Determine previous pipeline code (active or latest closed)
      let previousPipelineCode: string | null = null;
      if (currentPipeline && currentPipeline.recruitmentPipelineCode) {
        previousPipelineCode = currentPipeline.recruitmentPipelineCode;
      } else {
        // try get last pipeline history if no active pipeline
        const history = await this.candidatePipelineService.findByApplicationId(
          latestApplication.id,
        );
        if (history && history.length > 0) {
          previousPipelineCode =
            history[history.length - 1].recruitmentPipelineCode;
        }
      }

      // Query desired order from recruitment pipeline table
      const desiredRows: any[] = await queryRunner.query(
        `SELECT ` +
          "`order`" +
          ` AS ord, code FROM recruitment_pipeline WHERE code = ? LIMIT 1`,
        [updateStatusDto.status],
      );

      if (!desiredRows || !desiredRows[0]) {
        throw new BadRequestException(
          `Invalid target status code: ${updateStatusDto.status}`,
        );
      }

      const desiredOrder: number = desiredRows[0].ord;

      if (previousPipelineCode) {
        const prevRows: any[] = await queryRunner.query(
          `SELECT ` +
            "`order`" +
            ` AS ord, code FROM recruitment_pipeline WHERE code = ? LIMIT 1`,
          [previousPipelineCode],
        );

        if (prevRows && prevRows[0]) {
          const previousOrder: number = prevRows[0].ord;

          // Allow only when desiredOrder is strictly greater than previousOrder
          if (desiredOrder <= previousOrder) {
            throw new BadRequestException(
              `Cannot update status to '${updateStatusDto.status}' (order=${desiredOrder}). It must have higher order than previous status '${previousPipelineCode}' (order=${previousOrder}).`,
            );
          }
        }
      }

      if (currentPipeline) {
        // Close the current pipeline with endTime and result
        currentPipeline.endTime = new Date();
        currentPipeline.result =
          updateStatusDto.previousResult || PIPELINE_RESULT.PENDING;
        await queryRunner.manager.save(currentPipeline);
        this.logger.log(
          `Closed pipeline ${currentPipeline.id} with result: ${currentPipeline.result}`,
        );
      }
      // 4. Create new pipeline history entry for new status
      const newPipeline = this.candidatePipelineService.createEntity({
        candidateId: candidate.id,
        applicationId: latestApplication.id,
        recruitmentPipelineCode: updateStatusDto.status,
        startTime: new Date(),
        result: PIPELINE_RESULT.PENDING,
        note: updateStatusDto.note || null,
        createdBy: userId,
      });
      await queryRunner.manager.save(newPipeline);
      this.logger.log(
        `Created new pipeline with status: ${updateStatusDto.status}`,
      );

      // update status to do a statistic for role recruitment manager, only when status is FAIL
      // if (updateStatusDto.status === RECRUITMENT_PIPELINE_CODES.FAIL) {
      //   switch (latestApplication.status) {
      //     case RECRUITMENT_PIPELINE_CODES.IQ_TEST:
      //       await this.recruitmentManagerService.updateStatusCandidateReview(
      //         latestApplication.id,
      //         [RECRUITMENT_PIPELINE_CODES.DEPARTMENT_REVIEW],
      //         [ReviewStatus.PENDING],
      //         ReviewStatus.REJECT,
      //       );
      //       break;

      //     default:
      //       await this.recruitmentManagerService.updateStatusCandidateReview(
      //         latestApplication.id,
      //         [
      //           RECRUITMENT_PIPELINE_CODES.DEPARTMENT_REVIEW,
      //           RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_1,
      //         ],
      //         [ReviewStatus.PENDING, ReviewStatus.APPROVE],
      //         ReviewStatus.REJECT,
      //       );
      //       break;
      //   }
      // }

      // 5. Update application status using queryRunner
      latestApplication.status = updateStatusDto.status;

      // Update onboarding date if provided
      if (updateStatusDto.onboardingDate) {
        // Parse the provided date and convert it to Asia/Ho_Chi_Minh timezone
        const parsed = new Date(updateStatusDto.onboardingDate);
        const onboardingInTZ = new Date(
          parsed.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
        );
        latestApplication.onboardingDate = onboardingInTZ;
      }

      await queryRunner.manager.save(latestApplication);
      this.logger.log(
        `Updated application status to: ${updateStatusDto.status}`,
      );

      await queryRunner.commitTransaction();
      transactionCommitted = true;

      // Fetch complete result
      const result = await this.candidateService.findByIdWithRelations(
        candidateId,
      );

      // 6. create a candidate manager review to do a statistic for role recruitment manager
      const REVIEW_PIPELINES = new Set<string>([
        RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_1,
        RECRUITMENT_PIPELINE_CODES.ONBOARDING,
      ]);

      // if (REVIEW_PIPELINES.has(updateStatusDto.status)) {
      //   const departmentNames = (latestApplication.department ?? "")
      //     .split(",")
      //     .map((d) => d.trim())
      //     .filter(Boolean);

      //   const mailManagers =
      //     await this.recruitmentManagerService.findMailManagersByDepartments(
      //       departmentNames,
      //     );

      //   if (!mailManagers || mailManagers.length === 0) {
      //     throw new NotFoundException(
      //       `Mail manager not found for departments: ${departmentNames.join(
      //         ", ",
      //       )}`,
      //     );
      //   }

      //   switch (updateStatusDto.status) {
      //     case RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_1:
      //       await this.recruitmentManagerService.updateStatusCandidateReview(
      //         latestApplication.id,
      //         [RECRUITMENT_PIPELINE_CODES.DEPARTMENT_REVIEW],
      //         [ReviewStatus.PENDING],
      //         ReviewStatus.APPROVE,
      //       );
      //       break;
      //     case RECRUITMENT_PIPELINE_CODES.ONBOARDING:
      //       await this.recruitmentManagerService.updateStatusCandidateReview(
      //         latestApplication.id,
      //         [RECRUITMENT_PIPELINE_CODES.INTERVIEW_ROUND_1],
      //         [ReviewStatus.PENDING],
      //         ReviewStatus.APPROVE,
      //       );
      //       break;
      //     default:
      //       break;
      //   }

      //   for (const manager of mailManagers) {
      //     this.logger.log(
      //       `Found mail manager ${
      //         manager.email
      //       } for department(s): ${departmentNames.join(", ")}`,
      //     );

      //     // Only create a new review for managers who have a prior non-rejected review
      //     // (i.e. they are still active for this application)
      //     const existingReview = await this.dataSource.query(
      //       `SELECT id FROM rocket_recruitment_candidate_manager_review
      //        WHERE application_id = ? AND reviewer_id = ? AND status != ?
      //        LIMIT 1`,
      //       [latestApplication.id, manager.id, ReviewStatus.REJECT],
      //     );

      //     if (!existingReview || existingReview.length === 0) {
      //       this.logger.log(
      //         `Skipping createCandidateReview for manager ${manager.email} — no active (non-rejected) review found`,
      //       );
      //       continue;
      //     }

      //     await this.recruitmentManagerService.createCandidateReview(
      //       {
      //         application_id: latestApplication.id,
      //         pipeline_code: updateStatusDto.status,
      //         status: ReviewStatus.PENDING,
      //       },
      //       manager.email,
      //     );
      //   }
      // }

      return res.status(200).json(result);
    } catch (error) {
      if (!transactionCommitted) {
        await queryRunner.rollbackTransaction();
      }
      this.logger.log(`Error updating candidate status: ${error.message}`);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException({
        status: error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error?.response?.message || MESSAGE.SERVER_ERROR,
      });
    } finally {
      await queryRunner.release();
    }
  }

  async sendEmails(
    applicationId: number,
    input: MailRecruitmentDTO,
    files?: any[],
    res?: Response,
  ) {
    try {
      const { status, execute_at, cc } = input;

      // Fetch application with candidate info
      const application = await this.applicationService.findByIdWithRelations(
        applicationId,
      );
      if (!application) {
        throw new NotFoundException(
          `Application with ID ${applicationId} not found`,
        );
      }

      const candidate = application.candidate;
      if (!candidate) {
        throw new NotFoundException(
          `Candidate for application ID ${applicationId} not found`,
        );
      }

const emailTemplateResult =
  await this.emailTemplateService.findByPipelineCode(status);

const emailTemplate = Array.isArray(emailTemplateResult)
  ? emailTemplateResult[0]
  : emailTemplateResult;

if (!emailTemplate) {
  this.logger.log(
    `No email template found for status: ${status}, skipping email sending.`,
  );

  return res.status(404).json({
    message: `No email template found for status: ${status}`,
  });
}
      // Check if this is a scheduled email
      if (execute_at) {
        const executeAtDate = new Date(execute_at);

        // Validate execute_at is in the future
        if (executeAtDate <= new Date()) {
          throw new BadRequestException(
            "execute_at must be a future date and time",
          );
        }
        // Create scheduled job
  const scheduledJob = await this.scheduledJobService.create({
  jobType: "send_email",
  refType: "application",
  refId: applicationId,
  executeAt: executeAtDate,
  payload: {
    status,
    cc,
    type: input?.type,
    testLink: input.testLink,
    deadline: input.deadline,
    note1: input.note1,
    note2: input.note2,
    testDate: input.testDate,
    interviewDate: input.interviewDate,
    address: input.address,
    mapLink: input.mapLink,
    note3: input.note3,
    contact: input.contact,
    offerDate: input.offerDate,
    attachments: files
      ? files.map((f) => f.path || f.filename || f.originalname)
      : undefined,
  },
});

         this.logger.log(
           `Scheduled email job ${scheduledJob.id} for ${
             candidate.email
           } at ${executeAtDate.toISOString()}`,
         );

        return res.status(200).json({
          message: "Email scheduled successfully",
          scheduledAt: executeAtDate.toISOString(),
          // jobId: scheduledJob.id,
        });
      }

       // Send email immediately if no execute_at
       const data = emailTemplate.data || {};

       const context = {
         name: candidate.fullName,
         job:
           ((application as any).orderInfo?.position ?? application.position) +
           " " +
           application.level,
         level: application.level,
         is_intern:
           application.level &&
           application.level.toLowerCase().includes("intern"),
header_image_url: data.header_image_url,
logo_url: data.logo_url,
company_name: data.company_name,
company_address: data.company_address,
website_url: data.website_url,
phone: data.phone,
subject: emailTemplate.subject,

         type: input?.type,
         test_link: input?.testLink,
         deadline: input?.deadline,
         note1: input?.note1,
         note2: input?.note2,
         test_date: input?.testDate,
         interview_date: input?.interviewDate,
         address: input?.address,
         map_link: input?.mapLink,
         note: input?.note3,
         contact: input?.contact,
         offer_date: input?.offerDate,
       };

      // Prepare attachments from uploaded files
const attachments = files
  ? files.map((file) => {
      return {
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype,
      };
    })
  : undefined;

       const ccList = normalizeCc(cc);

       if (ccList) context["cc"] = ccList.join(", ");

       await this.mailRecruitmentService.sendRecruitmentEmail({
         to: candidate.email,
         subject: emailTemplate.subject,
         template: `recruitment_${status}`,
         context,
         attachments,
         ...(ccList ? { cc: ccList } : {}),
       });

      this.logger.log(
        `Sent email immediately to ${candidate.email} for application ${applicationId} with status ${status}`,
      );

      // Update test_online_status to SENT when sending IQ_TEST email
      if (status === RECRUITMENT_PIPELINE_CODES.IQ_TEST) {
        await this.applicationService.update(applicationId, {
          testOnlineStatus: TestOnlineStatus.SENT,
        });
        this.logger.log(
          `Updated test_online_status to SENT for application ${applicationId}`,
        );
      }

      return res.status(200).json({ message: "Email sent successfully" });
    } catch (error) {
      this.logger.error(
        `Error sending emails for application ${applicationId}: ${error.message}`,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Failed to send emails",
      });
    }
  }


  /**
   * Get all recruitment pipeline stages (no pagination)
   * @returns Array of pipeline stages
   */
  async getAllPipelineStages(): Promise<PipelineStageDTO[]> {
    try {
      this.logger.log("Fetching all recruitment pipeline stages");
      const pipelines = await this.pipelineService.findAll();

      // Transform to DTO
      return pipelines.map((pipeline) => ({
        id: pipeline.id,
        name: pipeline.name,
        code: pipeline.code,
        order: pipeline.order,
        isActive: pipeline.isActive,
      }));
    } catch (error) {
      this.logger.error("Error getting all pipeline stages", error);
      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Failed to fetch pipeline stages",
      });
    }
  }

  async getCandidatesGroupedByStatus(
    position?: string,
    search?: string,
    startDate?: string,
    endDate?: string,
    pic?: string,
  ): Promise<any[]> {
    try {
      // Get all active pipeline stages first
      const pipelines = await this.pipelineService.findAll();

      // Build query for applications using string table name
      // Join table rocket_recruitment_candidate_manager_review to get review status and review note
      let queryBuilder = this.dataSource
        .getRepository("recruitment_applications")
        .createQueryBuilder("app")
        .innerJoinAndSelect("app.candidate", "candidate")
        .leftJoinAndSelect("app.managerReviews", "review")
        .leftJoinAndSelect("review.reviewer", "reviewer")
        .leftJoinAndSelect("app.cvs", "cvs")
        .leftJoinAndMapOne(
          "app.orderInfo",
          RecruitmentOrder,
          "order",
          "app.position = CAST(order.id AS CHAR)",
        )
        .leftJoinAndMapOne(
          "app.creatorInfo",
          "personnel",
          "creator",
          "app.created_by = creator.personnel_code",
        )
        .where("app.deletedAt IS NULL")
        .andWhere("candidate.deletedAt IS NULL");

      // Apply position filter
      if (position) {
        queryBuilder = queryBuilder.andWhere(
          "(app.position = :position OR order.position = :position)",
          { position },
        );
      }

      // Apply search filter (name or email)
      if (search) {
        queryBuilder = queryBuilder.andWhere(
          "(candidate.fullName LIKE :search OR candidate.email LIKE :search)",
          { search: `%${search}%` },
        );
      }

      // Apply date range filter on appliedDate
      if (startDate) {
        queryBuilder = queryBuilder.andWhere("app.appliedDate >= :startDate", {
          startDate,
        });
      }

      if (endDate) {
        queryBuilder = queryBuilder.andWhere("app.appliedDate <= :endDate", {
          endDate,
        });
      }

      // Apply pic filter by creatorInfo personnelName
      if (pic) {
        queryBuilder = queryBuilder.andWhere(
          "creator.personnelName LIKE :pic",
          { pic: `%${pic}%` },
        );
      }

      // Get all applications
      const applications = await queryBuilder
        .orderBy("app.updatedAt", "DESC")
        .getMany();

      // Group applications by status
      const groupedData = pipelines.map((pipeline) => {
        const candidatesInStatus = applications.filter(
          (app) => app.status === pipeline.code,
        );

        return {
          status: pipeline.code,
          statusName: pipeline.name,
          displayOrder: pipeline.order,
          count: candidatesInStatus.length,
          candidates: candidatesInStatus.map((app) => ({
            id: app.id,
            candidateId: app.candidate.id,
            fullName: app.candidate.fullName,
            phone: app.candidate.phone,
            email: app.candidate.email,
            gender: app.candidate.gender,
            universitySchool: app.candidate.universitySchool,
            orderId: app.position,
            position: (app as any).orderInfo?.position ?? app.position,
            level: app.level,
            department: app.department,
            source: app.source,
            appliedDate: app.appliedDate,
            iqTest: app.iqTest,
            techTest: app.techTest,
            thinkingTest: app.thinkingTest,
            onboardingDate: app.onboardingDate,
            note: app.note,
            testOnlineStatus: app.testOnlineStatus,
            createdAt: app.createdAt,
            updatedAt: app.updatedAt,
            createdBy: (app as any).creatorInfo?.personnelName ?? null,
            cvs:
              app.cvs?.map((cv) => ({
                id: cv.id,
                filePath: cv.filePath,
                productLinks: cv.productLinks,
                createdAt: cv.createdAt,
              })) || [],
            managerReviews:
              app.managerReviews?.map((review) => ({
                id: review.id,
                pipelineCode: review.pipeline_code,
                reviewerId: review.reviewer_id,
                reviewerName: review.reviewer?.name ?? null,
                status: review.status,
                note: review.note,
                reviewedAt: review.reviewed_at,
                createdAt: review.created_at,
              })) || [],
          })),
        };
      });

      return groupedData.sort((a, b) => a.displayOrder - b.displayOrder);
    } catch (error) {
      this.logger.error("Error getting candidates grouped by status", error);
      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Failed to fetch candidates grouped by status",
      });
    }
  }

  /**
   * Get status list with candidate count per pipeline stage
   */
  async getStatusSummary(query: GroupedCandidatesQueryDto): Promise<
    Array<{
      status: string;
      statusName: string;
      displayOrder: number;
      count: number;
    }>
  > {
    try {
      const { position, search, startDate, endDate, pic } = query;

      const pipelines = await this.pipelineService.findAll();

      let queryBuilder = this.dataSource
        .getRepository("recruitment_applications")
        .createQueryBuilder("app")
        .innerJoin("app.candidate", "candidate")
        .leftJoinAndMapOne(
          "app.orderInfo",
          RecruitmentOrder,
          "order",
          "app.position = CAST(order.id AS CHAR)",
        )
        .leftJoinAndMapOne(
          "app.creatorInfo",
          "personnel",
          "creator",
          "app.created_by = creator.personnel_code",
        )
        .where("app.deletedAt IS NULL")
        .andWhere("candidate.deletedAt IS NULL");

      if (position) {
        queryBuilder = queryBuilder.andWhere(
          "(app.position = :position OR order.position = :position)",
          { position },
        );
      }

      if (search) {
        queryBuilder = queryBuilder.andWhere(
          "(candidate.fullName LIKE :search OR candidate.email LIKE :search)",
          { search: `%${search}%` },
        );
      }

      if (startDate) {
        queryBuilder = queryBuilder.andWhere("app.appliedDate >= :startDate", {
          startDate,
        });
      }

      if (endDate) {
        queryBuilder = queryBuilder.andWhere("app.appliedDate <= :endDate", {
          endDate,
        });
      }

      if (pic) {
        queryBuilder = queryBuilder.andWhere(
          "creator.personnelName LIKE :pic",
          { pic: `%${pic}%` },
        );
      }

      const applications = await queryBuilder.select("app.status").getMany();

      const countByStatus = new Map<string, number>();
      for (const app of applications) {
        countByStatus.set(app.status, (countByStatus.get(app.status) ?? 0) + 1);
      }

      return pipelines
        .map((pipeline) => ({
          status: pipeline.code,
          statusName: pipeline.name,
          displayOrder: pipeline.order,
          count: countByStatus.get(pipeline.code) ?? 0,
        }))
        .sort((a, b) => a.displayOrder - b.displayOrder);
    } catch (error) {
      this.logger.error("Error getting status summary", error);
      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Failed to fetch status summary",
      });
    }
  }

  /**
   * Get paginated candidates with optional filter by pipeline status
   */
  async getCandidatesPaged(
    header: BaseHeaderDTO,
    query: GetCandidatesPagedQueryDto,
    res: Response,
  ): Promise<Response> {
    try {
      const { page, size, active, direction } = header;
      const { position, search, startDate, endDate, pic, status } = query;
      const paginate = new PageRequest(page, size, `${active},${direction}`);

      let queryBuilder = this.dataSource
        .getRepository("recruitment_applications")
        .createQueryBuilder("app")
        .innerJoinAndSelect("app.candidate", "candidate")
        .leftJoinAndSelect("app.managerReviews", "review")
        .leftJoinAndSelect("review.reviewer", "reviewer")
        .leftJoinAndSelect("app.cvs", "cvs")
        .leftJoinAndMapOne(
          "app.orderInfo",
          RecruitmentOrder,
          "order",
          "app.position = CAST(order.id AS CHAR)",
        )
        .leftJoinAndMapOne(
          "app.creatorInfo",
          "personnel",
          "creator",
          "app.created_by = creator.personnel_code",
        )
        .where("app.deletedAt IS NULL")
        .andWhere("candidate.deletedAt IS NULL");

      if (status) {
        queryBuilder = queryBuilder.andWhere("app.status = :status", {
          status,
        });
      }

      if (position) {
        queryBuilder = queryBuilder.andWhere(
          "(app.position = :position OR order.position = :position)",
          { position },
        );
      }

      if (search) {
        queryBuilder = queryBuilder.andWhere(
          "(candidate.fullName LIKE :search OR candidate.email LIKE :search)",
          { search: `%${search}%` },
        );
      }

      if (startDate) {
        queryBuilder = queryBuilder.andWhere("app.appliedDate >= :startDate", {
          startDate,
        });
      }

      if (endDate) {
        queryBuilder = queryBuilder.andWhere("app.appliedDate <= :endDate", {
          endDate,
        });
      }

      if (pic) {
        queryBuilder = queryBuilder.andWhere(
          "creator.personnelName LIKE :pic",
          { pic: `%${pic}%` },
        );
      }

      const [applications, total] = await queryBuilder
        .orderBy("app.updatedAt", "DESC")
        .skip(paginate.skip)
        .take(paginate.size)
        .getManyAndCount();

      const data = applications.map((app) => ({
        id: app.id,
        candidateId: app.candidate.id,
        fullName: app.candidate.fullName,
        phone: app.candidate.phone,
        email: app.candidate.email,
        gender: app.candidate.gender,
        universitySchool: app.candidate.universitySchool,
        orderId: app.position,
        position: (app as any).orderInfo?.position ?? app.position,
        level: app.level,
        department: app.department,
        source: app.source,
        appliedDate: app.appliedDate,
        iqTest: app.iqTest,
        techTest: app.techTest,
        thinkingTest: app.thinkingTest,
        aiIsPotential: app.aiIsPotential,
        hrIsPotential: app.hrIsPotential,
        onboardingDate: app.onboardingDate,
        note: app.note,
        testOnlineStatus: app.testOnlineStatus,
        status: app.status,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        createdBy: (app as any).creatorInfo?.personnelName ?? null,
        cvs:
          app.cvs?.map((cv) => ({
            id: cv.id,
            filePath: cv.filePath,
            productLinks: cv.productLinks,
            createdAt: cv.createdAt,
          })) || [],
        managerReviews:
          app.managerReviews?.map((review) => ({
            id: review.id,
            pipelineCode: review.pipeline_code,
            reviewerId: review.reviewer_id,
            reviewerName: review.reviewer?.name ?? null,
            status: review.status,
            note: review.note,
            reviewedAt: review.reviewed_at,
            createdAt: review.created_at,
          })) || [],
      }));

      this.logger.log(
        `Retrieved ${total} paged candidates (page: ${paginate.page}, size: ${paginate.size})`,
      );

      return res
        .status(HttpStatus.OK)
        .json(handleResPagination(data, total, paginate.page, paginate.size));
    } catch (error) {
      this.logger.error("Error getting paged candidates", error);
      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Failed to fetch paged candidates",
      });
    }
  }

  async getPositionStatistics(): Promise<{
    positions: Array<{ orderId: string; position: string; count: number }>;
    totalApplications: number;
  }> {
    try {
      // Use raw query for better performance with GROUP BY
      // Join with rocket_recruitment_order to get position name
      // Group by position name to eliminate duplicates
      const result = await this.dataSource.query(`
        SELECT 
          MIN(CASE 
            WHEN o.id IS NOT NULL THEN CAST(o.id AS CHAR)
            ELSE app.position
          END) AS orderId,
          COALESCE(o.position, app.position) AS position,
          COUNT(*) as count
        FROM recruitment_applications app
        LEFT JOIN recruitment_order o ON app.position = CAST(o.id AS CHAR)
        WHERE app.deleted_at IS NULL
          AND app.position IS NOT NULL
          AND app.position != ''
          AND COALESCE(o.position, app.position) IS NOT NULL
          AND COALESCE(o.position, app.position) != 'NaN'
        GROUP BY COALESCE(o.position, app.position)
        ORDER BY count DESC, position ASC
      `);

      // Calculate total applications
      const totalApplications = result.reduce(
        (sum: number, item: any) => sum + parseInt(item.count),
        0,
      );

      // Format the result
      const positions = result.map((item: any) => ({
        orderId: item.orderId,
        position: item.position,
        count: parseInt(item.count),
      }));

      return {
        positions,
        totalApplications,
      };
    } catch (error) {
      this.logger.error("Error getting position statistics", error);
      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Failed to fetch position statistics",
      });
    }
  }

  async checkCandidateByEmailOrPhone(
    checkCandidateDto: CheckCandidateDTO,
  ): Promise<CheckCandidateResponseDTO> {
    try {
      const { email, phone } = checkCandidateDto;

      // Validate that at least one parameter is provided
      if (!email && !phone) {
        throw new BadRequestException("Either email or phone must be provided");
      }

      // Build query to find candidate
      let queryBuilder = this.dataSource
        .getRepository("recruitment_candidates")
        .createQueryBuilder("candidate")
        .leftJoinAndSelect("candidate.applications", "app")
        .where("candidate.deletedAt IS NULL");

      // Add email or phone condition
      if (email && phone) {
        queryBuilder = queryBuilder.andWhere(
          "(candidate.email = :email OR candidate.phone = :phone)",
          { email, phone },
        );
      } else if (email) {
        queryBuilder = queryBuilder.andWhere("candidate.email = :email", {
          email,
        });
      } else if (phone) {
        queryBuilder = queryBuilder.andWhere("candidate.phone = :phone", {
          phone,
        });
      }

      const candidate = await queryBuilder.getOne();

      // If candidate doesn't exist, return empty response
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

      // Get all applications for this candidate with order position
      const applications = await this.dataSource
        .getRepository("recruitment_applications")
        .createQueryBuilder("app")
        .leftJoinAndMapOne(
          "app.orderInfo",
          RecruitmentOrder,
          "ord",
          "app.position = CAST(ord.id AS CHAR)",
        )
        .where("app.candidateId = :candidateId", {
          candidateId: candidate.id,
        })
        .andWhere("app.deletedAt IS NULL")
        .orderBy("app.createdAt", "DESC")
        .getMany();

      // Map applications to DTO
      const applicationDTOs: CandidateApplicationHistoryDTO[] =
        applications.map((app: any) => ({
          applicationId: app.id,
          position: app.orderInfo?.position ?? app.position,
          level: app.level,
          gpa: app.gpa,
          department: app.department,
          status: app.status,
          appliedDate: app.appliedDate,
          createdAt: app.createdAt,
        }));

      return {
        exists: true,
        candidateId: candidate.id,
        fullName: candidate.fullName,
        universitySchool: candidate.universitySchool,
        birthday: candidate.birthday,
        email: candidate.email,
        phone: candidate.phone,
        gender: candidate.gender,
        applications: applicationDTOs,
      };
    } catch (error) {
      this.logger.error(
        "Error checking candidate by email or phone",
        error.message,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Failed to check candidate information",
      });
    }
  }
}
