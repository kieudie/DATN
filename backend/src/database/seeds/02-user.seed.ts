import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { DEFAULT_PASSWORD } from '../../common/constants/recruitment.constants';
import { Role } from '../../entities/role.entity';
import { UserRole } from '../../entities/user-role.entity';
import { User } from '../../entities/user.entity';
import { RoleType } from '../../security';

export class UserSeed implements Seeder {
  async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const roleRepository = dataSource.getRepository(Role);
    const userRoleRepository = dataSource.getRepository(UserRole);

    const adminRole = await roleRepository.findOne({
      where: {
        code: RoleType.ADMIN,
      },
    });

    const recruitmentManagerRole = await roleRepository.findOne({
      where: {
        code: RoleType.RECRUITMENT_MANAGER,
      },
    });

    if (!adminRole || !recruitmentManagerRole) {
      throw new Error('Role mặc định chưa tồn tại');
    }

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const users = [
      {
        fullName: 'HR Admin',
        email: 'hr@admin.com',
        passwordHash,
        phone: '0900000001',
        isActive: 1,
        roles: [adminRole],
      },
      {
        fullName: 'Manager GX',
        email: 'manager.gx@admin.com',
        passwordHash,
        phone: '0900000002',
        isActive: 1,
        roles: [recruitmentManagerRole],
      },
      {
        fullName: 'Manager UC',
        email: 'manager.uc@admin.com',
        passwordHash,
        phone: '0900000003',
        isActive: 1,
        roles: [recruitmentManagerRole],
      },
    ];

    console.log('Seeding users...');

    for (const userData of users) {
      let user = await userRepository.findOne({
        where: {
          email: userData.email,
        },
      });

      if (!user) {
        user = userRepository.create({
          fullName: userData.fullName,
          email: userData.email,
          passwordHash: userData.passwordHash,
          phone: userData.phone,
          isActive: userData.isActive,
        });

        user = await userRepository.save(user);

        console.log(`Created user: ${userData.email}`);
      } else {
        user.fullName = userData.fullName;
        user.passwordHash = userData.passwordHash;
        user.phone = userData.phone;
        user.isActive = userData.isActive;

        user = await userRepository.save(user);

        console.log(`Updated user: ${userData.email}`);
      }

      await userRoleRepository.delete({
        userId: user.id,
      });

      for (const role of userData.roles) {
        const userRole = userRoleRepository.create({
          userId: user.id,
          roleId: role.id,
        });

        await userRoleRepository.save(userRole);

        console.log(`Assigned role ${role.code} to user: ${userData.email}`);
      }
    }

    console.log('Users seeded successfully!');
  }
}