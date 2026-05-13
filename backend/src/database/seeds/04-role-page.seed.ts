import { DataSource, In } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { AccessLevel } from '../../common/constants/constants';
import { Page } from '../../entities/page';
import { Role } from '../../entities/role';
import { RolePage } from '../../entities/role-page';
import { RoleType } from '../../security';

export class RolePageSeed implements Seeder {
  async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const rolePageRepository = dataSource.getRepository(RolePage);
    const roleRepository = dataSource.getRepository(Role);
    const pageRepository = dataSource.getRepository(Page);

    const hrPages = [
      {
        pageCode: 'home',
        accessLevel: AccessLevel.READ,
      },
      {
        pageCode: 'recruitment_management',
        accessLevel: AccessLevel.WRITE,
      },
      {
        pageCode: 'recruitment_candidate_list',
        accessLevel: AccessLevel.WRITE,
      },
      {
        pageCode: 'recruitment_pipeline',
        accessLevel: AccessLevel.WRITE,
      },
      {
        pageCode: 'recruitment_manager_management',
        accessLevel: AccessLevel.WRITE,
      },
      {
        pageCode: 'recruitment_order_management',
        accessLevel: AccessLevel.WRITE,
      },
      {
        pageCode: 'recruitment_order_pipeline',
        accessLevel: AccessLevel.WRITE,
      },
      {
        pageCode: 'recruitment_report',
        accessLevel: AccessLevel.WRITE,
      },
      {
        pageCode: 'recruitment_report_overview',
        accessLevel: AccessLevel.WRITE,
      },
      {
        pageCode: 'recruitment_report_effectiveness',
        accessLevel: AccessLevel.WRITE,
      },
      {
        pageCode: 'recruitment_report_speed',
        accessLevel: AccessLevel.WRITE,
      },
    ];

    const managerPages = [
      {
        pageCode: 'home',
        accessLevel: AccessLevel.READ,
      },
      {
        pageCode: 'recruitment_management',
        accessLevel: AccessLevel.READ,
      },
      {
        pageCode: 'recruitment_manager_candidates',
        accessLevel: AccessLevel.WRITE,
      },
      {
        pageCode: 'recruitment_order_manager',
        accessLevel: AccessLevel.WRITE,
      },
      {
        pageCode: 'recruitment_manager_my_candidate',
        accessLevel: AccessLevel.WRITE,
      },
    ];

    const rolePageMappings = {
      [RoleType.ADMIN]: hrPages,
      [RoleType.RECRUITMENT_MANAGER]: managerPages,
    };

    console.log('Seeding role pages...');

    const managedRoleCodes = Object.keys(rolePageMappings);

    const managedRoles = await roleRepository.find({
      where: {
        code: In(managedRoleCodes),
      },
    });

    if (managedRoles.length > 0) {
      await rolePageRepository.delete({
        roleId: In(managedRoles.map((role) => role.id)),
      });

      console.log('Deleted old role-page mappings for HR and Manager.');
    }

    for (const [roleCode, pageMappings] of Object.entries(rolePageMappings)) {
      console.log(`Processing role: ${roleCode}`);

      const role = await roleRepository.findOne({
        where: {
          code: roleCode,
        },
      });

      if (!role) {
        console.log(`Role '${roleCode}' not found. Skipping...`);
        continue;
      }

      for (const pageMapping of pageMappings) {
        const page = await pageRepository.findOne({
          where: {
            code: pageMapping.pageCode,
          },
        });

        if (!page) {
          console.log(
            `Page with code '${pageMapping.pageCode}' not found. Skipping...`,
          );
          continue;
        }

        const rolePage = rolePageRepository.create({
          roleId: role.id,
          pageId: page.id,
          accessLevel: pageMapping.accessLevel,
          createdAt: new Date(),
        });

        await rolePageRepository.save(rolePage);

        console.log(
          `Created role-page relationship: ${roleCode} -> ${pageMapping.pageCode}`,
        );
      }
    }

    console.log('Role pages seeded successfully!');
  }
}