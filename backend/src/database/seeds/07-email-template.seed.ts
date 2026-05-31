import * as fs from "fs";
import * as path from "path";
import { DataSource } from "typeorm";
import { Seeder } from "typeorm-extension";

export default class EmailTemplateSeed implements Seeder {
  private templatesDir = path.join(
    __dirname,
    "../../main/mail-recruitment/templates"
  );

  public async run(dataSource: DataSource): Promise<void> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Get recruitment pipeline IDs by code
      const pipelines: any[] = await queryRunner.query(`
        SELECT id, code FROM recruitment_pipeline WHERE code IN (
          'received_cv', 
          'iq_test', 
          'technical_test', 
          'interview_round_1', 
          'fail'
        )
      `);

      const pipelineMap = pipelines.reduce((map, p) => {
        map[p.code] = p.id;
        return map;
      }, {} as Record<string, number>);

      // Common default data for all templates
      const commonData = {
        header_image_url: "https://i.postimg.cc/yYkywDkF/image.png",
        logo_url: "https://i.postimg.cc/SsbypYSn/image.png",
        company_name: "CG Game Studio - Onesoft",
        company_address:
          "Tầng 8, tòa nhà Gold Tower, số 275 Nguyễn Trãi, Phường Khương Đình, TP. Hà Nội",
        website_url: "https://rocketgamestudio.com",
        phone: "(+84) 984578828",
      };

      // Template definitions
      const templates = [
        // 1. Received CV Template
        {
          code: "received_cv",
          templateFile: "recruitment_received_cv.hbs",
          type: "invite",
          subject: "[CG GAME STUDIO] THƯ CẢM ƠN ỨNG TUYỂN",
          data: { ...commonData },
        },
        // 2. IQ Test Template
        {
          code: "iq_test",
          templateFile: "recruitment_iq_test.hbs",
          type: "invite",
          subject: "[CG GAME STUDIO] THƯ MỜI THAM GIA BÀI TEST ONLINE",
          data: {
            ...commonData,
          },
        },
        // 3. Technical Test Template
        {
          code: "technical_test",
          templateFile: "recruitment_technical_test.hbs",
          type: "invite",
          subject: "[CG GAME STUDIO] THƯ MỜI THAM GIA BÀI TEST OFFLINE",
          data: {
            ...commonData,
          },
        },
        // 4. Interview Round 1 Template
        {
          code: "interview_round_1",
          templateFile: "recruitment_interview_round_1.hbs",
          type: "invite",
          subject: "[CG GAME STUDIO] THƯ MỜI PHỎNG VẤN",
          data: {
            ...commonData,
          },
        },
        // 5. Fail Template
        {
          code: "fail",
          templateFile: "recruitment_fail.hbs",
          type: "fail",
          subject: "[CG GAME STUDIO] THƯ CẢM ƠN",
          data: { ...commonData },
        },
      ];

      // Insert/Update templates
      for (const template of templates) {
        const pipelineId = pipelineMap[template.code];
        if (!pipelineId) {
          console.warn(
            `Warning: Pipeline '${template.code}' not found, skipping...`
          );
          continue;
        }

        // Read template content from .hbs file
        const templatePath = path.join(
          this.templatesDir,
          template.templateFile
        );
        let contentHtml: string;

        try {
          contentHtml = fs.readFileSync(templatePath, "utf-8");
        } catch (error) {
          console.warn(
            `Warning: Template file '${template.templateFile}' not found, skipping...`
          );
          continue;
        }

        const existing: any[] = await queryRunner.query(
          `SELECT id FROM email_template WHERE recruitment_pipeline_id = ? AND type = ?`,
          [pipelineId, template.type]
        );

        if (existing.length > 0) {
          await queryRunner.query(
            `UPDATE email_template SET subject = ?, content_html = ?, data = ?, is_active = 1 WHERE id = ?`,
            [
              template.subject,
              contentHtml,
              JSON.stringify(template.data),
              existing[0].id,
            ]
          );
          console.log(`✓ Updated template: ${template.code}`);
        } else {
          await queryRunner.query(
            `INSERT INTO rocket_email_template (recruitment_pipeline_id, type, subject, content_html, data, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
            [
              pipelineId,
              template.type,
              template.subject,
              contentHtml,
              JSON.stringify(template.data),
            ]
          );
          console.log(`✓ Inserted template: ${template.code}`);
        }
      }

      console.log("✓ Email templates seeded successfully!");
    } catch (error) {
      console.error("Error seeding email templates:", error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
