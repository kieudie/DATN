import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { SCHEDULED_JOB_STATUS } from "src/common/constants/recruitment.constants";
import { Repository } from "typeorm";
import { ScheduledJob } from "../../entities/scheduled-job";

@Injectable()
export class ScheduledJobService {
  constructor(
    @InjectRepository(ScheduledJob)
    private readonly scheduledJobRepository: Repository<ScheduledJob>
  ) {}

  /**
   * Create a new scheduled job
   */
  async create(data: {
    jobType: string;
    refType: string;
    refId: number;
    executeAt: Date;
    payload: any;
  }): Promise<ScheduledJob> {
    const job = this.scheduledJobRepository.create({
      jobType: data.jobType,
      refType: data.refType,
      refId: data.refId,
      executeAt: data.executeAt,
      payload: data.payload,
      status: SCHEDULED_JOB_STATUS.PENDING,
    });
    return await this.scheduledJobRepository.save(job);
  }

  /**
   * Get pending jobs that are ready to execute
   */
  async getPendingJobs(limit: number = 100): Promise<ScheduledJob[]> {
    return await this.scheduledJobRepository
      .createQueryBuilder("job")
      .where("job.status = :status", { status: SCHEDULED_JOB_STATUS.PENDING })
      .andWhere("job.executeAt <= :now", { now: new Date() })
      .orderBy("job.executeAt", "ASC")
      .limit(limit)
      .getMany();
  }

  /**
   * Update job status to processing
   */
  async markAsProcessing(jobId: number): Promise<void> {
    await this.scheduledJobRepository.update(jobId, {
      status: SCHEDULED_JOB_STATUS.PROCESSING,
    });
  }

  /**
   * Update job status to done
   */
  async markAsDone(jobId: number): Promise<void> {
    await this.scheduledJobRepository.update(jobId, {
      status: SCHEDULED_JOB_STATUS.DONE,
    });
  }

  /**
   * Update job status to failed
   */
  async markAsFailed(jobId: number): Promise<void> {
    await this.scheduledJobRepository.update(jobId, {
      status: SCHEDULED_JOB_STATUS.FAILED,
    });
  }

  /**
   * Find job by ID
   */
  async findById(jobId: number): Promise<ScheduledJob | null> {
    return await this.scheduledJobRepository.findOne({
      where: { id: jobId },
    });
  }
}
