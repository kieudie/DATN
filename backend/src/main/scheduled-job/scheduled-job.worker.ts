import { Injectable } from "@nestjs/common";
import {
  SCHEDULED_JOB_TYPE,
  SCHEDULED_REF_TYPE,
} from "src/common/constants/recruitment.constants";
import { LoggerService } from "../../common/logger/logger.service";
import { EmailTemplateService } from "../mail-recruitment/email-template.service";
import { MailRecruitmentService } from "../mail-recruitment/mail-recruitment.service";
import { ApplicationService } from "../recruitment-candidate/application/application.service";
import { normalizeCc } from "../recruitment-candidate/helper/recruitment.helper";
import { ScheduledJobService } from "./scheduled-job.service";

@Injectable()
export class ScheduledJobWorker {
  private readonly logger = new LoggerService("ScheduledJobWorker");
  private isProcessing = false;

  constructor(
    private readonly scheduledJobService: ScheduledJobService,
    private readonly mailRecruitmentService: MailRecruitmentService,
    private readonly applicationService: ApplicationService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  /**
   * Run every minute to check for pending jobs
   */
  // @Cron(CronExpression.EVERY_MINUTE)
  async processPendingJobs() {
    // Prevent concurrent execution
    if (this.isProcessing) {
      this.logger.log("Job processing already in progress, skipping...");
      return;
    }

    this.isProcessing = true;

    try {
      const jobs = await this.scheduledJobService.getPendingJobs(50);

      if (jobs.length === 0) {
        this.logger.log("No pending jobs to process");
        return;
      }

      this.logger.log(`Processing ${jobs.length} pending jobs`);

      for (const job of jobs) {
        try {
          // Mark as processing
          await this.scheduledJobService.markAsProcessing(job.id);

          // Process based on job type
          switch (job.jobType) {
            case SCHEDULED_JOB_TYPE.SEND_EMAIL:
              await this.processSendMailJob(job);
              break;

            default:
              this.logger.log(`Unknown job type: ${job.jobType}`);
              await this.scheduledJobService.markAsFailed(job.id);
          }

          // Mark as done
          await this.scheduledJobService.markAsDone(job.id);
          this.logger.log(`Job ${job.id} completed successfully`);
        } catch (error) {
          this.logger.error(
            `Error processing job ${job.id}: ${error.message}`,
            error.stack,
          );
          await this.scheduledJobService.markAsFailed(job.id);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in processPendingJobs: ${error.message}`,
        error.stack,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process send_mail job for recruitment
   */
  private async processSendMailJob(job: any) {
    const { refType, refId, payload } = job;

    const { cc } = payload;

    if (refType !== SCHEDULED_REF_TYPE.CANDIDATE) {
      throw new Error(`Unsupported refType: ${refType}`);
    }

    // Get application and candidate info
    const application = await this.applicationService.findByIdWithRelations(
      refId,
    );

    if (!application) {
      throw new Error(`Application with ID ${refId} not found`);
    }

    const candidate = application.candidate;
    if (!candidate) {
      throw new Error(`Candidate for application ID ${refId} not found`);
    }

    // Get email template
  const emailTemplateResult =
  await this.emailTemplateService.findByPipelineCode(payload.status);

  const emailTemplate = Array.isArray(emailTemplateResult)
  ? emailTemplateResult[0]
  : emailTemplateResult;

  if (!emailTemplate) {
  throw new Error(`Email template not found for status ${payload.status}`);
  }

  const { data } = emailTemplate;

    // Build email context
    const context = {
      name: candidate.fullName,
      job:
        ((application as any).orderInfo?.position ?? application.position) +
        " " +
        application.level,
      level: application.level,
      is_intern:
        application.level && application.level.toLowerCase().includes("intern"),
      header_image_url: data.header_image_url,
      logo_url: data.logo_url,
      company_name: data.company_name,
      company_address: data.company_address,
      website_url: data.website_url,
      phone: data.phone,
      subject: emailTemplate.subject,

      type: payload?.type,
      test_link: payload?.testLink,
      deadline: payload?.deadline,
      note1: payload?.note1,
      note2: payload?.note2,
      test_date: payload?.testDate,
      interview_date: payload?.interviewDate,
      address: payload?.address,
      map_link: payload?.mapLink,
      note: payload?.note3,
      contact: payload?.contact,
      offer: payload?.offerDate,
    };

    // Send email
    const ccList = normalizeCc(cc);

    if (ccList) context["cc"] = ccList.join(", ");

    await this.mailRecruitmentService.sendRecruitmentEmail({
      to: candidate.email,
      subject: emailTemplate.subject,
      template: `recruitment_${payload.status}`,
      context,
      ...(ccList ? { cc: ccList } : {}),
    });

    this.logger.log(
      `Sent scheduled email to ${candidate.email} for application ${refId} with status ${payload.status}`,
    );
  }
}
