import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationSubUser1780085963014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = "notification_sub_user";
    const tableExist = await queryRunner.hasTable(table);
    if (!tableExist) {
      await queryRunner.query(
        `CREATE TABLE notification_sub_user (
          id INT NOT NULL AUTO_INCREMENT,
          personnel_code INT(11) NOT NULL,
          end_point LONGTEXT NOT NULL,
          expiration_time BIGINT(20) NULL DEFAULT NULL,
          p256dh LONGTEXT NOT NULL,
          auth LONGTEXT NOT NULL,
          created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NULL DEFAULT NULL,
          deleted_at DATETIME NULL DEFAULT NULL,
          PRIMARY KEY (id));`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = "notification_sub_user";

    const tableExists = await queryRunner.hasTable(table);
    if (tableExists) {
      await queryRunner.query(
        `DROP TABLE notification_sub_user`
      );
    }
  }
}
