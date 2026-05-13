import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTableRecruitment1778644696861
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) recruitment_pipeline
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`recruitment_pipeline\` (
        \`id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(255) NOT NULL,
        \`order\` INT(2) NOT NULL,
        \`code\` VARCHAR(50) NOT NULL,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_ci
        COMMENT='Danh mục các bước (pipeline) tuyển dụng';
    `);

    // 2) candidates
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`candidates\` (
        \`id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`full_name\` VARCHAR(255) NULL,
        \`phone\` VARCHAR(20) NULL,
        \`email\` VARCHAR(255) NOT NULL,
        \`gender\` VARCHAR(20) NULL COMMENT 'Giới tính của ứng viên (male/female)',
        \`birthday\` VARCHAR(50) NULL,
        \`university_school\` VARCHAR(255) NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` DATETIME NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`ux_recruitment_candidates_email\` (\`email\`)
      ) ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_ci
        COMMENT='Thông tin ứng viên';
    `);

    // 3) applications
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`applications\` (
        \`id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`candidate_id\` INT(11) NOT NULL,
        \`position\` VARCHAR(255) NULL,
        \`level\` VARCHAR(50) NULL,
        \`department\` VARCHAR(100) NULL,
        \`source\` VARCHAR(100) NULL,
        \`applied_date\` DATE NULL,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'received_cv',
        \`note\` TEXT NULL COMMENT 'Ghi chú của application',
        \`created_by\` INT(11) NULL DEFAULT NULL,
        \`iq_test\` VARCHAR(50) NULL,
        \`tech_test\` VARCHAR(50) NULL,
        \`thinking_test\` VARCHAR(50) NULL,
        \`onboarding_date\` DATE NULL,
        \`test_online_status\` ENUM('sent','passed','not_attempt','failed') NULL,
        \`gpa\` VARCHAR(50) NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` DATETIME NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_application_candidate_id\` (\`candidate_id\`),
        KEY \`idx_application_status\` (\`status\`),
        CONSTRAINT \`fk_application_candidate\`
          FOREIGN KEY (\`candidate_id\`) REFERENCES \`candidates\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_ci
        COMMENT='Đơn ứng tuyển - một ứng viên có thể có nhiều đơn';
    `);

    // 4) candidate_cvs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`candidate_cvs\` (
        \`id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`candidate_id\` INT(11) NOT NULL,
        \`application_id\` INT(11) NOT NULL,
        \`file_path\` TEXT NOT NULL,
        \`product_links\` TEXT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_recruitment_candidates_cv_candidate_id\` (\`candidate_id\`),
        KEY \`idx_cv_application_id\` (\`application_id\`),
        CONSTRAINT \`fk_recruitment_candidates_cv_candidate\`
          FOREIGN KEY (\`candidate_id\`) REFERENCES \`candidates\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_cv_application\`
          FOREIGN KEY (\`application_id\`) REFERENCES \`applications\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_ci
        COMMENT='Lưu CV/đường dẫn file CV của ứng viên';
    `);

    // 5) candidate_pipeline
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`candidate_pipeline\` (
        \`id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`candidate_id\` INT(11) NOT NULL,
        \`application_id\` INT(11) NOT NULL,
        \`recruitment_pipeline_code\` VARCHAR(50) NOT NULL,
        \`start_time\` DATETIME NOT NULL,
        \`end_time\` DATETIME NULL,
        \`result\` ENUM('pass','fail','pending') NOT NULL DEFAULT 'pending',
        \`note\` TEXT NULL,
        \`created_by\` INT(11) NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_recruitment_candidate_pipeline_candidate_id\` (\`candidate_id\`),
        KEY \`idx_pipeline_application_id\` (\`application_id\`),
        KEY \`recruitment_pipeline_code\` (\`recruitment_pipeline_code\`),
        CONSTRAINT \`fk_recruitment_candidate_pipeline_candidate\`
          FOREIGN KEY (\`candidate_id\`) REFERENCES \`candidates\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_pipeline_application\`
          FOREIGN KEY (\`application_id\`) REFERENCES \`applications\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_ci
        COMMENT='Lịch sử ứng viên đi qua các bước tuyển dụng';
    `);

    // 6) scheduled_job
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`scheduled_job\` (
        \`id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`job_type\` VARCHAR(50) NOT NULL,
        \`ref_type\` VARCHAR(50) NOT NULL,
        \`ref_id\` INT(11) NOT NULL,
        \`execute_at\` DATETIME NOT NULL,
        \`payload\` JSON NOT NULL,
        \`status\` ENUM('pending','processing','done','failed') NOT NULL DEFAULT 'pending',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_job_pending_execute\` (\`status\`, \`execute_at\`)
      ) ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_ci
        COMMENT='Bảng queue job chạy theo lịch (send_email/push_notification, ...)';
    `);
    // 7) email_template
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`email_template\` (
        \`id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`recruitment_pipeline_id\` INT(11) NOT NULL,
        \`type\` ENUM('invite','pass','fail') NOT NULL,
        \`subject\` VARCHAR(255) NOT NULL,
        \`content_html\` TEXT NOT NULL,
        \`data\` JSON NULL COMMENT 'Default JSON data for email template variables',
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        KEY \`idx_email_template_recruitment_pipeline_id\` (\`recruitment_pipeline_id\`),
        CONSTRAINT \`fk_email_template_recruitment_pipeline\`
          FOREIGN KEY (\`recruitment_pipeline_id\`) REFERENCES \`recruitment_pipeline\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_ci
        COMMENT='Template email theo pipeline (invite/pass/fail)';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`email_template\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`scheduled_job\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`candidate_pipeline\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`candidate_cvs\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`applications\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`candidates\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`recruitment_pipeline\`;`);
  }
}