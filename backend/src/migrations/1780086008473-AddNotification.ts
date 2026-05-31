import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotification1780086008473 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = "notification";
    const tableExist = await queryRunner.hasTable(table);
    if (!tableExist) {
      await queryRunner.query(
        `CREATE TABLE notification (
            id INT NOT NULL AUTO_INCREMENT,
            personnel_code INT(11) NOT NULL,
            title LONGTEXT NOT NULL,
            body LONGTEXT NOT NULL,
            is_send TINYINT(1) NOT NULL DEFAULT 0,
            is_read TINYINT(1) NOT NULL DEFAULT 0,
            date DATE NOT NULL,
            created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL DEFAULT NULL,
            deleted_at DATETIME NULL DEFAULT NULL,
            PRIMARY KEY (id));`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = "notification";

    const tableExists = await queryRunner.hasTable(table);
    if (tableExists) {
      await queryRunner.query(`DROP TABLE notification`);
    }
  }
}
