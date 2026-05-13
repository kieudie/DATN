import {
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccessLevel, MESSAGE } from '../../common/constants/constants';
import { Role } from '../../entities/role';

@Injectable()
export class RolePageService {
  constructor(private readonly dataSource: DataSource) {}

  async getPagesByRole(roleCode: string) {
    try {
      const role = await this.dataSource.getRepository(Role).findOne({
        where: {
          code: roleCode,
        },
      });

      if (!role) {
        throw new NotFoundException({
          status: HttpStatus.NOT_FOUND,
          message: MESSAGE.ROLE_NOT_FOUND,
        });
      }

      const rows = await this.dataSource.query(
        `
          SELECT 
            p.id,
            p.parent_id,
            p.code,
            p.name,
            p.path,
            p.description,
            p.has_children,
            p.is_group,
            p.priority,
            p.created_at,
            p.updated_at,
            rp.access_level
          FROM pages p
          INNER JOIN role_pages rp ON rp.page_id = p.id
          WHERE rp.role_id = ?
            AND p.deleted_at IS NULL
          ORDER BY p.priority ASC;
        `,
        [role.id],
      );

      return this.buildTree(rows);
    } catch (error) {
      throw new InternalServerErrorException({
        status: error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error?.response?.message || MESSAGE.SERVER_ERROR,
      });
    }
  }

  async getMenusByRoleCodes(roleCodes: string[]) {
    try {
      if (!roleCodes || roleCodes.length === 0) {
        return [];
      }

      const placeholders = roleCodes.map(() => '?').join(',');

      const rows = await this.dataSource.query(
        `
          SELECT 
            p.id,
            p.parent_id,
            p.code,
            p.name,
            p.path,
            p.description,
            p.has_children,
            p.is_group,
            p.priority,
            p.created_at,
            p.updated_at,
            rp.access_level,
            r.code AS role_code
          FROM pages p
          INNER JOIN role_pages rp ON rp.page_id = p.id
          INNER JOIN roles r ON r.id = rp.role_id
          WHERE r.code IN (${placeholders})
            AND p.deleted_at IS NULL
          ORDER BY p.priority ASC;
        `,
        roleCodes,
      );

      const dedupedMap = new Map<number, any>();

      const rank: Record<string, number> = {
        [AccessLevel.NONE]: 1,
        [AccessLevel.READ]: 2,
        [AccessLevel.WRITE]: 3,
        [AccessLevel.ADMIN]: 4,
      };

      rows.forEach((row) => {
        const existed = dedupedMap.get(row.id);

        if (!existed) {
          dedupedMap.set(row.id, row);
          return;
        }

        if (rank[row.access_level] > rank[existed.access_level]) {
          dedupedMap.set(row.id, row);
        }
      });

      return this.buildTree(Array.from(dedupedMap.values()));
    } catch (error) {
      throw new InternalServerErrorException({
        status: error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error?.response?.message || MESSAGE.SERVER_ERROR,
      });
    }
  }

  private buildTree(rows: any[]): any[] {
    const map = new Map<number, any>();
    const roots: any[] = [];

    rows.forEach((row) => {
      map.set(row.id, {
        id: row.id,
        parent_id: row.parent_id,
        code: row.code,
        name: row.name,
        path: row.path,
        description: row.description,
        has_children: row.has_children,
        is_group: row.is_group,
        priority: row.priority,
        access_level: row.access_level,
        created_at: row.created_at,
        updated_at: row.updated_at,
        sub: [],
      });
    });

    rows.forEach((row) => {
      const current = map.get(row.id);

      if (row.parent_id) {
        const parent = map.get(row.parent_id);

        if (parent) {
          parent.sub.push(current);
        }
      } else {
        roots.push(current);
      }
    });

    const sortNodes = (items: any[]) => {
      items.sort((a, b) => a.priority - b.priority);
      items.forEach((item) => sortNodes(item.sub));
    };

    sortNodes(roots);

    return roots;
  }
}