import { DataSource } from "typeorm";
import { Seeder, SeederFactoryManager } from "typeorm-extension";
import { AccessLevel } from "../../common/constants/constants";
import { Page } from "../../entities/page";
import { Role } from "../../entities/role";
import { RolePage } from "../../entities/role-page";
import { RoleType } from "../../security";

export class RecruitmentManagementRoleSeed implements Seeder {
  async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<void> {
    const pageRepository = dataSource.getRepository(Page);
    const roleRepository = dataSource.getRepository(Role);
    const rolePageRepository = dataSource.getRepository(RolePage);

    console.log("Starting recruitment management role seeding...");

    // Define the pages to create
    const pages = [
      // Parent page - Quản lý tuyển dụng (Group)
      {
        id: 82,
        parentId: null,
        code: "recruitment_management",
        name: "QUẢN LÝ TUYỂN DỤNG",
        path: "/recruitment",
        description: "Quản lý quy trình tuyển dụng và ứng viên",
        hasChildren: true,
        isGroup: true,
        priority: 27, // After QUẢN LÝ NHÂN VIÊN which has priority 26
      },
      // Child page 1 - Danh sách ứng viên
      {
        id: 83,
        parentId: 82,
        code: "recruitment_candidate_list",
        name: "Kho ứng viên",
        path: "/recruitment/candidates",
        description:
          "Xem và quản lý danh sách ứng viên với tính năng tìm kiếm và lọc",
        hasChildren: false,
        isGroup: false,
        priority: 28,
      },
      // Child page 2 - Drag drop ứng viên
      {
        id: 84,
        parentId: 82,
        code: "recruitment_pipeline",
        name: "Quản lý quy trình tuyển dụng",
        path: "/recruitment/pipeline",
        description: "Quản lý quy trình tuyển dụng với giao diện Kanban",
        hasChildren: false,
        isGroup: false,
        priority: 29,
      },
    ];

    // Create or update pages (idempotent)
    for (const pageData of pages) {
      let page = await pageRepository.findOne({
        where: { code: pageData.code },
      });

      if (page) {
        console.log(`Page '${pageData.code}' already exists. Updating...`);
        // Update existing page
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
        // Create new page
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
      console.log(`Page '${pageData.code}' saved successfully.`);
    }

    // Create or update the recruitment management role (idempotent)
    let recruitmentRole = await roleRepository.findOne({
      where: { code: RoleType.RECRUITMENT_MANAGEMENT },
    });

    if (recruitmentRole) {
    console.log(
       `Role '${RoleType.RECRUITMENT_MANAGEMENT}' already exists with ID: ${recruitmentRole.id}`
     );
    // Update description if needed
    recruitmentRole.name = "Quản lý tuyển dụng và ứng viên";
    await roleRepository.save(recruitmentRole);
    } else {
      console.log(`Creating new role '${RoleType.RECRUITMENT_MANAGEMENT}'...`);
      recruitmentRole = roleRepository.create({
        code: RoleType.RECRUITMENT_MANAGEMENT,
        name: "Quản lý tuyển dụng và ứng viên",
      });
      await roleRepository.save(recruitmentRole);
      console.log(
        `Role '${RoleType.RECRUITMENT_MANAGEMENT}' created with ID: ${recruitmentRole.id}`
      );
    }

    // Map role to pages (idempotent)
    const pageCodes = [
      "recruitment_management", // Parent page
      "recruitment_candidate_list", // Child page 1
      "recruitment_pipeline", // Child page 2
    ];

    for (const pageCode of pageCodes) {
      const page = await pageRepository.findOne({
        where: { code: pageCode },
      });

      if (!page) {
        console.log(`Page with code '${pageCode}' not found. Skipping...`);
        continue;
      }

      // Check if role-page mapping already exists
      const existingRolePage = await rolePageRepository.findOne({
        where: {
          roleId: recruitmentRole.id,
          pageId: page.id,
        },
      });

      if (existingRolePage) {
        console.log(
          `Role-page mapping already exists: ${RoleType.RECRUITMENT_MANAGEMENT} -> ${pageCode}. Updating access level...`
        );
        existingRolePage.accessLevel = AccessLevel.WRITE;
        await rolePageRepository.save(existingRolePage);
      } else {
        console.log(
          `Creating role-page mapping: ${RoleType.RECRUITMENT_MANAGEMENT} -> ${pageCode}`
        );
        const rolePage = rolePageRepository.create({
          roleId: recruitmentRole.id,
          pageId: page.id,
          accessLevel: AccessLevel.WRITE, // Write access for recruitment management
          createdAt: new Date(),
        });
        await rolePageRepository.save(rolePage);
      }

      console.log(
        `Role-page relationship saved: ${RoleType.RECRUITMENT_MANAGEMENT} -> ${pageCode}`
      );
    }

    console.log("Recruitment management role seeded successfully!");
  }
}
