import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsTechleadToRecruitmentManager1779733659403
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`recruitment_manager\`
      ADD COLUMN \`is_techlead\` VARCHAR(50) NULL COMMENT 'Techlead role, e.g. Tester_1'
      AFTER \`specialization\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`recruitment_manager\`
      DROP COLUMN \`is_techlead\`
    `);
  }
}
