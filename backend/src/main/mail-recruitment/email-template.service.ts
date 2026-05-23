import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EmailTemplate } from "src/entities/email-template";
import { Repository } from "typeorm";

@Injectable()
export class EmailTemplateService {
  constructor(
    @InjectRepository(EmailTemplate)
    private readonly emailTemplateRepository: Repository<EmailTemplate>
  ) {}

  /**
   * Find email template by recruitment pipeline code and type
   * @param pipelineCode - The recruitment pipeline code (e.g., 'received_cv', 'iq_test')
   * @param type - Template type ('invite', 'pass', 'fail')
   * @returns Email template entity with content and data
   */
  async findByPipelineCodeAndType(
    pipelineCode: string,
    type: "invite" | "pass" | "fail"
  ): Promise<EmailTemplate> {
    const template = await this.emailTemplateRepository
      .createQueryBuilder("template")
      .leftJoinAndSelect("template.recruitmentPipeline", "pipeline")
      .where("pipeline.code = :pipelineCode", { pipelineCode })
      .andWhere("template.type = :type", { type })
      .andWhere("template.is_active = 1")
      .getOne();

    if (!template) {
      throw new NotFoundException(
        `Email template not found for pipeline '${pipelineCode}' and type '${type}'`
      );
    }

    return template;
  }

  /**
   * Find all email templates for a specific recruitment pipeline
   * @param pipelineCode - The recruitment pipeline code
   * @returns Array of email templates
   */
  async findByPipelineCode(pipelineCode: string): Promise<EmailTemplate[]> {
    return this.emailTemplateRepository
      .createQueryBuilder("template")
      .leftJoinAndSelect("template.recruitmentPipeline", "pipeline")
      .where("pipeline.code = :pipelineCode", { pipelineCode })
      .andWhere("template.is_active = 1")
      .getMany();
  }

  /**
   * Find email template by ID
   * @param id - Template ID
   * @returns Email template entity
   */
  async findById(id: number): Promise<EmailTemplate> {
    const template = await this.emailTemplateRepository.findOne({
      where: { id },
      relations: ["recruitmentPipeline"],
    });

    if (!template) {
      throw new NotFoundException(`Email template with ID ${id} not found`);
    }

    return template;
  }

  /**
   * Update email template
   * @param id - Template ID
   * @param updateData - Data to update
   * @returns Updated template
   */
  async update(
    id: number,
    updateData: Partial<EmailTemplate>
  ): Promise<EmailTemplate> {
    await this.emailTemplateRepository.update(id, updateData);
    return this.findById(id);
  }
}
