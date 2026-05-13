import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersAndRoles1778344062952
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SET SESSION sql_mode='NO_AUTO_VALUE_ON_ZERO';");

    await queryRunner.query(
      'CREATE TABLE `roles` (' +
        '`id` INT(11) NOT NULL AUTO_INCREMENT, ' +
        '`code` VARCHAR(50) NOT NULL, ' +
        '`name` VARCHAR(255) NOT NULL, ' +
        '`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
        '`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, ' +
        'PRIMARY KEY (`id`), ' +
        'UNIQUE INDEX `unq_roles_code` (`code` ASC)' +
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    );

    await queryRunner.query(
      'CREATE TABLE `users` (' +
        '`id` INT(11) NOT NULL AUTO_INCREMENT, ' +
        '`full_name` VARCHAR(255) NOT NULL, ' +
        '`email` VARCHAR(255) NOT NULL, ' +
        '`password_hash` VARCHAR(255) NOT NULL, ' +
        '`phone` VARCHAR(20) NULL, ' +
        '`is_active` TINYINT(1) NOT NULL DEFAULT 1, ' +
        '`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
        '`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, ' +
        'PRIMARY KEY (`id`), ' +
        'UNIQUE INDEX `unq_users_email` (`email` ASC)' +
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    );

    await queryRunner.query(
      'CREATE TABLE `user_roles` (' +
        '`user_id` INT(11) NOT NULL COMMENT "Khóa ngoại đến users.id", ' +
        '`role_id` INT(11) NOT NULL COMMENT "Khóa ngoại đến roles.id", ' +
        '`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT "Ngày tạo", ' +
        'PRIMARY KEY (`user_id`, `role_id`) USING BTREE, ' +
        'KEY `idx_user_roles_role_id` (`role_id`) USING BTREE, ' +
        'CONSTRAINT `fk_user_roles_user_id` ' +
        'FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ' +
        'ON DELETE CASCADE ON UPDATE CASCADE, ' +
        'CONSTRAINT `fk_user_roles_role_id` ' +
        'FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ' +
        'ON DELETE CASCADE ON UPDATE CASCADE' +
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="Bảng phân quyền role cho user";',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `user_roles`;');
    await queryRunner.query('DROP TABLE IF EXISTS `users`;');
    await queryRunner.query('DROP TABLE IF EXISTS `roles`;');
  }
}