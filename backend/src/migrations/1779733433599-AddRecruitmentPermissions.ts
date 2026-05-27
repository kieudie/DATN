import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRecruitmentPermissions1779733433599
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE recruitment_manager_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        manager_id INT NOT NULL,
        scope ENUM('view', 'approve', 'comment') NOT NULL,
        specialization VARCHAR(255) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

        UNIQUE KEY ux_mgr_scope_spec (manager_id, scope, specialization),
        KEY idx_mgr_perm_manager (manager_id),
        KEY idx_mgr_perm_spec (specialization),

        CONSTRAINT fk_mgr_perm_manager FOREIGN KEY (manager_id)
          REFERENCES recruitment_manager(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS recruitment_manager_permissions`,
    );
  }
}
