import { DataSource } from "typeorm";
import { Seeder, SeederFactoryManager } from "typeorm-extension";
import { AccessLevel } from "../../common/constants/constants";
import { Page } from "../../entities/page";
import { Role } from "../../entities/role";
import { RolePage } from "../../entities/role-page";
import { RoleType } from "../../security";

export class RecruitmentOrderPagesSeed implements Seeder {
  async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const pageRepository = dataSource.getRepository(Page);
    const roleRepository = dataSource.getRepository(Role);
    const rolePageRepository = dataSource.getRepository(RolePage);

    console.log("Starting recruitment order pages seeding...");

    // 2 separate pages for the 2 roles
    const pages = [
      {
        id: 89,
        parentId: 82, // Under QUẢN LÝ TUYỂN DỤNG
        code: "recruitment_order_manager",
        name: "Danh sách Order",
        path: "/recruitment/orders/manager",
        description:
          "Danh sách yêu cầu tuyển dụng dành cho Recruitment Manager",
        hasChildren: false,
        isGroup: false,
        priority: 32,
        role: RoleType.RECRUITMENT_MANAGER,
      },
      {
        id: 90,
        parentId: 82, // Under QUẢN LÝ TUYỂN DỤNG
        code: "recruitment_order_management",
        name: "Danh sách Order",
        path: "/recruitment/orders/management",
        description:
          "Danh sách yêu cầu tuyển dụng dành cho Recruitment Management",
        hasChildren: false,
        isGroup: false,
        priority: 33,
        role: RoleType.RECRUITMENT_MANAGEMENT,
      },
    ];

    for (const pageData of pages) {
      // Upsert page
      let page = await pageRepository.findOne({
        where: { code: pageData.code },
      });

      if (page) {
        console.log(`Page '${pageData.code}' already exists. Updating...`);
        page.name = pageData.name;
        page.path = pageData.path;
        page.description = pageData.description;
        page.hasChildren = pageData.hasChildren ? 1 : 0;
        page.isGroup = pageData.isGroup ? 1 : 0;
        page.priority = pageData.priority;
        page.parentId = pageData.parentId;
        page.updatedAt = new Date();
      } else {
        console.log(`Creating new page '${pageData.code}'...`);
        page = pageRepository.create({
          parentId: pageData.parentId,
          code: pageData.code,
          name: pageData.name,
          path: pageData.path,
          description: pageData.description,
          hasChildren: pageData.hasChildren ? 1 : 0,
          isGroup: pageData.isGroup ? 1 : 0,
          priority: pageData.priority,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        });
      }

      await pageRepository.save(page);
      console.log(`Page '${pageData.code}' saved.`);

      // Find and map role
      const role = await roleRepository.findOne({
        where: { code: pageData.role },
      });

      if (!role) {
        console.warn(
          `Role '${pageData.role}' not found. Skipping role-page mapping for '${pageData.code}'.`,
        );
        continue;
      }

      const savedPage = await pageRepository.findOne({
        where: { code: pageData.code },
      });

      if (!savedPage) {
        console.warn(`Page '${pageData.code}' not found after save. Skipping.`);
        continue;
      }

      const existingRolePage = await rolePageRepository.findOne({
        where: { roleId: role.id, pageId: savedPage.id },
      });

      if (existingRolePage) {
        console.log(
          `Role-page mapping already exists: ${pageData.role} -> ${pageData.code}. Updating access level...`,
        );
        existingRolePage.accessLevel = AccessLevel.WRITE;
        await rolePageRepository.save(existingRolePage);
      } else {
        console.log(
          `Creating role-page mapping: ${pageData.role} -> ${pageData.code}`,
        );
        const rolePage = rolePageRepository.create({
          roleId: role.id,
          pageId: savedPage.id,
          accessLevel: AccessLevel.WRITE,
          createdAt: new Date(),
        });
        await rolePageRepository.save(rolePage);
      }

      console.log(
        `Role-page mapping saved: ${pageData.role} -> ${pageData.code}`,
      );
    }

    console.log("Recruitment order pages seeded successfully!");
  }
}
