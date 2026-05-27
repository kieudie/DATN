import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTableRecruitmentManager1779732988832
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) recruitment_manager
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`recruitment_manager\` (
        \`id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(255) NULL,
        \`email\` VARCHAR(255) NOT NULL,
        \`is_cc\` TINYINT(1) NOT NULL DEFAULT 0,
        \`department_name\` VARCHAR(50) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`ux_recruitment_manager_email\` (\`email\`)
      ) ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_ci
        COMMENT='Danh sách quản lý phê duyệt tuyển dụng';
    `);

    // 2) recruitment_candidate_manager_review
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`recruitment_candidate_manager_review\` (
        \`id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`application_id\` INT(11) NOT NULL,
        \`pipeline_code\` VARCHAR(50) NULL,
        \`reviewer_id\` INT(11) NOT NULL,
        \`status\` ENUM('PENDING','APPROVE','REJECT') NOT NULL,
        \`note\` TEXT NULL,
        \`reviewed_at\` DATE NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_review_application_id\` (\`application_id\`),
        KEY \`idx_review_reviewer_id\` (\`reviewer_id\`),
        CONSTRAINT \`fk_review_application\`
          FOREIGN KEY (\`application_id\`) REFERENCES \`applications\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_review_reviewer\`
          FOREIGN KEY (\`reviewer_id\`) REFERENCES \`recruitment_manager\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_ci
        COMMENT='Lịch sử phê duyệt ứng viên từ quản lý';
    `);

    // 3) Add test_online_status column to recruitment_applications
    // NOTE: Project mới đã có cột test_online_status trong bảng applications
    // từ migration AddTableRecruitment nên không chạy lại đoạn này.
    // await queryRunner.query(`
    //   ALTER TABLE \`recruitment_applications\`
    //   ADD COLUMN \`test_online_status\` ENUM('sent','passed','not_attempt','failed') NULL;
    // `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // NOTE: Không drop test_online_status vì cột này không thuộc migration này.
    // await queryRunner.query(`
    //   ALTER TABLE \`recruitment_applications\`
    //   DROP COLUMN \`test_online_status\`;
    // `);

    // Drop theo thứ tự ngược để tránh lỗi FK
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`recruitment_candidate_manager_review\`;
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS \`recruitment_manager\`;
    `);
  }
}