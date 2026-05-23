import { MailerService } from "@nestjs-modules/mailer";
import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as handlebars from "handlebars";
import * as nodemailer from "nodemailer";
import { join } from "path";
import { LoggerService } from "src/common/logger/logger.service";
import { config } from "../../config/config";

@Injectable()
export class MailRecruitmentService {
  private readonly logger = new LoggerService("MailRecruitmentService");
  private transporter: nodemailer.Transporter;
  private templatesDir: string;
  private isMailEnabled: boolean;

  constructor(private readonly mailerService: MailerService) {
    // Create a dedicated transporter for recruitment emails so templates and transport are independent
    this.transporter = nodemailer.createTransport({
      host: config.get("mail-recruitment.host"),
      port: Number(config.get("mail-recruitment.port")) || 465,
      secure: true,
      auth: {
        user: config.get("mail-recruitment.user"),
        pass: config.get("mail-recruitment.password"),
      },
    });

    // runtime templates folder (works from src and dist because __dirname points to compiled folder when built)
    this.templatesDir = join(__dirname, "templates");

    // Check if mail sending is enabled via environment variable
    this.isMailEnabled = process.env.MAIL_RECRUITMENT_ENABLED === "true";
    this.logger.log(`Mail recruitment enabled: ${this.isMailEnabled}`);
  }

  async sendMail(
    to: string,
    subject: string,
    html: string,
    attachments?: Array<{
      filename: string;
      content: Buffer;
      contentType?: string;
    }>,
  ): Promise<void> {
    if (!this.isMailEnabled) {
      this.logger.log(
        `Mail sending is disabled. Would have sent email to: ${to}, subject: ${subject}`,
      );
      return;
    }

    await this.transporter.sendMail({
      from: config.get("mail-recruitment.from"),
      to,
      subject,
      html,
      attachments,
    });
  }

  async sendMailWithCC(
    to: string,
    cc: string | string[],
    subject: string,
    html: string,
    attachments?: Array<{
      filename: string;
      content: Buffer;
      contentType?: string;
    }>,
  ): Promise<void> {
    if (!this.isMailEnabled) {
      this.logger.log(
        `Mail sending is disabled. Would have sent email to: ${to}, cc: ${cc}, subject: ${subject}`,
      );
      return;
    }

    await this.mailerService.sendMail({
      to,
      cc,
      subject,
      html,
      attachments,
    });
  }

  async sendMailWithTemplate(
    to: string,
    subject: string,
    template: string,
    context: any,
    attachments?: Array<{
      filename: string;
      content: Buffer;
      contentType?: string;
    }>,
  ): Promise<void> {
    if (!this.isMailEnabled) {
      this.logger.log(
        `Mail sending is disabled. Would have sent email to: ${to}, subject: ${subject}, template: ${template}`,
      );
      return;
    }

    // Load template file from mail-recruitment templates folder
    const templatePath = join(this.templatesDir, `${template}.hbs`);
    const contentHtml = fs.readFileSync(templatePath, "utf-8");
    const compiled = handlebars.compile(contentHtml);
    const html = compiled(context || {});

    await this.transporter.sendMail({
      from: config.get("mail-recruitment.from"),
      to,
      subject,
      html,
      attachments,
    });
  }

  async sendRecruitmentEmail(data: {
    to: string;
    subject: string;
    template: string;
    context: any;
    cc?: string | string[];
    attachments?:
      | string[]
      | Array<{
          filename: string;
          content: Buffer;
          contentType: string;
        }>;
  }): Promise<void> {
    if (!this.isMailEnabled) {
      this.logger.log(
        `Mail sending is disabled. Would have sent recruitment email to: ${data.to}, subject: ${data.subject}, template: ${data.template}`,
      );
      return;
    }

    // If template name is provided, compile from templates dir and send via dedicated transporter
    if (data.template) {
      const templatePath = join(this.templatesDir, `${data.template}.hbs`);
      const contentHtml = fs.readFileSync(templatePath, "utf-8");
      const compiled = handlebars.compile(contentHtml);
      const html = compiled(data.context || {});

      await this.transporter.sendMail({
        from: config.get("mail-recruitment.from"),
        to: data.to,
        subject: data.subject,
        html,
        cc: data.cc,
        attachments: data.attachments as any,
      });
      return;
    }

    // Fallback: if no template name, send raw HTML from context.templateHtml
    await this.transporter.sendMail({
      from: config.get("mail-recruitment.from"),
      to: data.to,
      subject: data.subject,
      html: (data.context && (data.context as any).templateHtml) || "",
      attachments: data.attachments as any,
    });
  }

  /**
   * Send recruitment email using HTML content from database
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param contentHtml - Handlebars template string from database
   * @param context - Data to be merged with template
   */
  async sendRecruitmentEmailFromDB(
    to: string,
    subject: string,
    contentHtml: string,
    context: Record<string, any>,
  ): Promise<void> {
    try {
      if (!this.isMailEnabled) {
        this.logger.log(
          `Mail sending is disabled. Would have sent recruitment email from DB to: ${to}, subject: ${subject}`,
        );
        return;
      }

      // Compile Handlebars template from database
      const compiledTemplate = handlebars.compile(contentHtml);
      const html = compiledTemplate(context);

      await this.transporter.sendMail({
        from: config.get("mail-recruitment.from"),
        to,
        subject,
        html,
      });

      this.logger.log(`Sent recruitment email to ${to}`);
    } catch (error) {
      this.logger.error(
        `Error sending recruitment email to ${to}: ${error.message}`,
      );
      throw error;
    }
  }
}
