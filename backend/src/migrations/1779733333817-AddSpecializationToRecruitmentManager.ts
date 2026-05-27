import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSpecializationToRecruitmentManager1779733333817
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`recruitment_manager\`
      ADD COLUMN \`specialization\` VARCHAR(255) NULL COMMENT 'Chuyên môn/lĩnh vực phụ trách'
      AFTER \`department_name\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`recruitment_manager\`
      DROP COLUMN \`specialization\`
    `);
  }
}
