import { MailerModule } from "@nestjs-modules/mailer";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/adapters/handlebars.adapter";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { join } from "path";
import { config } from "../../config/config";
import { EmailTemplate } from "../../entities/email-template";
import { EmailTemplateService } from "./email-template.service";
import { MailRecruitmentService } from "./mail-recruitment.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailTemplate]),
    MailerModule.forRoot({
      transport: {
        host: config.get("mail-recruitment.host"),
        port: config.get("mail-recruitment.port"),
        secure: true,
        auth: {
          user: config.get("mail-recruitment.user"),
          pass: config.get("mail-recruitment.password"),
        },
      },
      defaults: {
        from: config.get("mail-recruitment.from"),
      },
      template: {
        dir: join(__dirname, "templates"),
        adapter: new HandlebarsAdapter({
          inc: (a) => Number(a) + 1,
        }),
        options: { strict: true },
      },
    }),
  ],
  providers: [MailRecruitmentService, EmailTemplateService],
  exports: [MailRecruitmentService, EmailTemplateService],
})
export class MailRecruitmentModule {}
