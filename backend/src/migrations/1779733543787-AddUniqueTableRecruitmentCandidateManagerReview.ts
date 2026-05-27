import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueTableRecruitmentCandidateManagerReview1779733543787
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old index (standard DROP INDEX syntax)
   // await queryRunner.query(`
   //   DROP INDEX \`IDX_candidate_manager_review\` ON \`recruitment_candidate_manager_review\`;
    //`);

    // Create new index with reviewer_id
    await queryRunner.query(`
      CREATE UNIQUE INDEX \`IDX_candidate_manager_review\` ON \`recruitment_candidate_manager_review\` (\`application_id\`, \`pipeline_code\`, \`reviewer_id\`);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new index
    await queryRunner.query(`
      DROP INDEX \`IDX_candidate_manager_review\` ON \`recruitment_candidate_manager_review\`;
    `);

    // Restore old index with only application_id and pipeline_code
    await queryRunner.query(`
      CREATE UNIQUE INDEX \`IDX_candidate_manager_review\` ON \`recruitment_candidate_manager_review\` (\`application_id\`, \`pipeline_code\`);
    `);
  }
}
