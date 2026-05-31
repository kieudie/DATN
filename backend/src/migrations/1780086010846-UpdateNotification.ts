import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateNotification1780086010846 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
   // await queryRunner.query(
     // `
      //ALTER TABLE notification
     // ADD COLUMN main_noti_id INT NULL DEFAULT NULL AFTER id ;      
    //`
    //);

    const table = "main_notification";

    const tableExists = await queryRunner.hasTable(table);
    if (!tableExists) {
      await queryRunner.query(
        `
          CREATE TABLE main_notification (
            id INT NOT NULL AUTO_INCREMENT,
            type VARCHAR(256) NOT NULL,
            subject VARCHAR(256) NULL,
            title LONGTEXT NOT NULL,
            body LONGTEXT NOT NULL,
            is_create_noti TINYINT(1) NOT NULL DEFAULT '0',
            date DATE NOT NULL,
            created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL DEFAULT NULL,
            deleted_at DATETIME NULL DEFAULT NULL,
            PRIMARY KEY (id),
            UNIQUE INDEX id_UNIQUE (id ASC));
        `
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        ALTER TABLE notification 
        DROP COLUMN main_noti_id;      
      `
    );

    const table = "main_notification";

    const tableExists = await queryRunner.hasTable(table);
    if (tableExists) {
      await queryRunner.query(
        `
            DROP TABLE main_notification
          `
      );
    }
  }
}
