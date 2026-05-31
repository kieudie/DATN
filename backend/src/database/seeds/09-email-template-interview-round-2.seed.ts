import * as fs from "fs";
import * as path from "path";
import { DataSource } from "typeorm";
import { Seeder } from "typeorm-extension";

export default class EmailTemplateInterviewRound2Seed implements Seeder {
  private templatesDir = path.join(
    __dirname,
    "../../main/mail-recruitment/templates"
  );

  public async run(dataSource: DataSource): Promise<void> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Get recruitment pipeline ID for 'interview_round_2'
      const pipelines: any[] = await queryRunner.query(`
        SELECT id, code FROM recruitment_pipeline WHERE code = 'interview_round_2'
      `);

      if (!pipelines || pipelines.length === 0) {
        console.warn(
          "Warning: Pipeline 'interview_round_2' not found, please run recruitment-pipeline seed first."
        );
        return;
      }

      const pipelineId = pipelines[0].id;

      // Common default data for template
      const commonData = {
        header_image_url: "https://i.postimg.cc/yYkywDkF/image.png",
        logo_url: "https://i.postimg.cc/SsbypYSn/image.png",
        company_name: "CG Game Studio - Onesoft",
        company_address:
          "Tầng 8, tòa nhà Gold Tower, số 275 Nguyễn Trãi, Phường Khương Đình, TP. Hà Nội",
        website_url: "https://rocketgamestudio.com",
        phone: "(+84) 984578828",
      };

      // Interview Round 2 template definition
      const template = {
        code: "interview_round_2",
        templateFile: "recruitment_interview_round_2.hbs",
        type: "invite",
        subject: "[CG GAME STUDIO] THƯ MỜI PHỎNG VẤN VÒNG 2",
        data: { ...commonData },
      };

      // Read template content from .hbs file
      const templatePath = path.join(this.templatesDir, template.templateFile);
      let contentHtml: string;

      try {
        contentHtml = fs.readFileSync(templatePath, "utf-8");
      } catch (error) {
        console.error(
          `Error: Template file '${template.templateFile}' not found at ${templatePath}`
        );
        throw error;
      }

      // Check if template already exists
      const existing: any[] = await queryRunner.query(
        `SELECT id FROM email_template WHERE recruitment_pipeline_id = ? AND type = ?`,
        [pipelineId, template.type]
      );

      if (existing.length > 0) {
        // Update existing template
        await queryRunner.query(
          `UPDATE email_template SET subject = ?, content_html = ?, data = ?, is_active = 1 WHERE id = ?`,
          [
            template.subject,
            contentHtml,
            JSON.stringify(template.data),
            existing[0].id,
          ]
        );
        console.log(`✓ Updated email template: ${template.code}`);
      } else {
        // Insert new template
        await queryRunner.query(
          `INSERT INTO email_template (recruitment_pipeline_id, type, subject, content_html, data, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
          [
            pipelineId,
            template.type,
            template.subject,
            contentHtml,
            JSON.stringify(template.data),
          ]
        );
        console.log(`✓ Inserted email template: ${template.code}`);
      }

      console.log(
        "✓ Email template 'Thư mời phỏng vấn vòng 2' seeded successfully!"
      );
    } catch (error) {
      console.error("Error seeding email template interview round 2:", error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
