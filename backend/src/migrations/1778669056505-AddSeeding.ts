
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSeedings1778669056505 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
                   CREATE TABLE IF NOT EXISTS seedings (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    name VARCHAR(255) NOT NULL);
                  `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS seedings;");
  }
}