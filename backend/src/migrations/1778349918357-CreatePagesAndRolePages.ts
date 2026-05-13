import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePagesAndRolePages1778349918357
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`pages\` (
        \`id\` INT(11) NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính',
        \`parent_id\` INT(11) NULL COMMENT 'ID cha, null nếu là menu cấp 1',
        \`code\` VARCHAR(50) NOT NULL COMMENT 'Mã định danh page',
        \`name\` VARCHAR(100) NOT NULL COMMENT 'Tên hiển thị trang',
        \`path\` VARCHAR(255) NOT NULL COMMENT 'Đường dẫn route hoặc API',
        \`description\` TEXT NULL COMMENT 'Mô tả chức năng của page',
        \`has_children\` TINYINT(1) DEFAULT '0' COMMENT 'Có submenu hay không',
        \`is_group\` TINYINT(1) DEFAULT '0' COMMENT 'Có phải nhóm menu hay không',
        \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Ngày tạo',
        \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Ngày cập nhật',
        \`deleted_at\` TIMESTAMP NULL DEFAULT NULL COMMENT 'Xóa mềm',
        \`priority\` INT DEFAULT '0',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uniq_pages_code\` (\`code\`),
        UNIQUE KEY \`uniq_pages_path\` (\`path\`),
        KEY \`idx_pages_parent_id\` (\`parent_id\`),
        CONSTRAINT \`fk_pages_parent_id\`
          FOREIGN KEY (\`parent_id\`)
          REFERENCES \`pages\` (\`id\`)
          ON DELETE SET NULL
          ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bảng định nghĩa các page/menu hệ thống';
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`role_pages\` (
        \`role_id\` INT(11) NOT NULL COMMENT 'Khóa ngoại đến roles.id',
        \`page_id\` INT(11) NOT NULL COMMENT 'Khóa ngoại đến pages.id',
        \`access_level\` ENUM('none', 'read', 'write', 'admin') NOT NULL DEFAULT 'none' COMMENT 'Quyền truy cập',
        \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Ngày tạo',
        PRIMARY KEY (\`role_id\`, \`page_id\`) USING BTREE,
        KEY \`idx_role_pages_page_id\` (\`page_id\`) USING BTREE,
        CONSTRAINT \`fk_role_pages_role_id\`
          FOREIGN KEY (\`role_id\`)
          REFERENCES \`roles\` (\`id\`)
          ON DELETE CASCADE
          ON UPDATE CASCADE,
        CONSTRAINT \`fk_role_pages_page_id\`
          FOREIGN KEY (\`page_id\`)
          REFERENCES \`pages\` (\`id\`)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bảng phân quyền giữa role và page';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`role_pages\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`pages\`;`);
  }
}