import { DataSource, In, Not } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { Role } from '../../entities/role';
import { RolePage } from '../../entities/role-page';
import { UserRole } from '../../entities/user-role';
import { RoleType } from '../../security';

export class RoleSeed implements Seeder {
  async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const roleRepository = dataSource.getRepository(Role);
    const userRoleRepository = dataSource.getRepository(UserRole);
    const rolePageRepository = dataSource.getRepository(RolePage);

    console.log('Seeding roles...');

    const activeRoles = [
      {
        code: RoleType.ADMIN,
        name: 'HR',
      },
      {
        code: RoleType.RECRUITMENT_MANAGER,
        name: 'Manager',
      },
    ];

    const activeRoleCodes = activeRoles.map((role) => role.code);

    const oldRoles = await roleRepository.find({
      where: {
        code: Not(In(activeRoleCodes)),
      },
    });

    if (oldRoles.length > 0) {
      const oldRoleIds = oldRoles.map((role) => role.id);

      await userRoleRepository.delete({
        roleId: In(oldRoleIds),
      });

      await rolePageRepository.delete({
        roleId: In(oldRoleIds),
      });

      await roleRepository.delete({
        id: In(oldRoleIds),
      });

      console.log(
        `Deleted old roles: ${oldRoles.map((role) => role.code).join(', ')}`,
      );
    }

    for (const roleData of activeRoles) {
      const existedRole = await roleRepository.findOne({
        where: {
          code: roleData.code,
        },
      });

      if (existedRole) {
        existedRole.name = roleData.name;

        await roleRepository.save(existedRole);

        console.log(`Updated role: ${roleData.code}`);
        continue;
      }

      const role = roleRepository.create({
        code: roleData.code,
        name: roleData.name,
      });

      await roleRepository.save(role);

      console.log(`Created role: ${roleData.code}`);
    }

    console.log('Roles seeded successfully!');
  }
}