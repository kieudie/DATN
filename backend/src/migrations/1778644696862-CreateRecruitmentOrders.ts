import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRecruitmentOrders1778644696862
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`recruitment_orders\` (
        \`id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`team\` VARCHAR(50) NULL,
        \`position\` VARCHAR(255) NULL,
        \`status\` ENUM('inprogress','closed','cancelled','pending','expired') NOT NULL DEFAULT 'pending',
        \`hr_level\` VARCHAR(255) NULL,
        \`note\` TEXT NULL,
        \`quantity\` VARCHAR(10) NULL,
        \`expired_date\` DATE NULL,
        \`start_date\` DATE NULL,
        \`created_by\` VARCHAR(50) NULL,
        \`pic\` VARCHAR(10) NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` DATETIME NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_order_status\` (\`status\`),
        KEY \`idx_order_created_by\` (\`created_by\`),
        KEY \`idx_order_pic\` (\`pic\`)
      ) ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_ci
        COMMENT='Đơn yêu cầu tuyển dụng';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`recruitment_orders\`;
    `);
  }
}