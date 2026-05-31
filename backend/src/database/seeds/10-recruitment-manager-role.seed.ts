import { DataSource } from "typeorm";
import { Seeder, SeederFactoryManager } from "typeorm-extension";
import { AccessLevel } from "../../common/constants/constants";
import { Page } from "../../entities/page";
import { Role } from "../../entities/role";
import { RolePage } from "../../entities/role-page";
import { RoleType } from "../../security";

export class RecruitmentManagerRoleSeed implements Seeder {
  async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const pageRepository = dataSource.getRepository(Page);
    const roleRepository = dataSource.getRepository(Role);
    const rolePageRepository = dataSource.getRepository(RolePage);

    console.log("Starting recruitment manager role seeding...");

    // Define the pages to create
    const pages = [
      // Page for RECRUITMENT_MANAGER role - Danh sách ứng viên theo manager
      {
        id: 86,
        parentId: 82, // Under QUẢN LÝ TUYỂN DỤNG
        code: "recruitment_manager_candidates",
        name: "Ứng viên của tôi",
        path: "/recruitment/my-candidates",
        description: "Danh sách ứng viên được phân công cho manager",
        hasChildren: false,
        isGroup: false,
        priority: 30,
      },
      // Page for RECRUITMENT_MANAGEMENT role - Quản lý manager
      {
        id: 87,
        parentId: 82, // Under QUẢN LÝ TUYỂN DỤNG
        code: "recruitment_manager_management",
        name: "Quản lý Manager",
        path: "/recruitment/managers",
        description: "Quản lý danh sách manager phê duyệt tuyển dụng",
        hasChildren: false,
        isGroup: false,
        priority: 31,
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

    // Create or update the recruitment_manager role (idempotent)
    let recruitmentManagerRole = await roleRepository.findOne({
      where: { code: RoleType.RECRUITMENT_MANAGER },
    });

    if (recruitmentManagerRole) {
      console.log(
        `Role '${RoleType.RECRUITMENT_MANAGER}' already exists with ID: ${recruitmentManagerRole.id}`,
      );
      // Update description if needed
      recruitmentManagerRole.name = "Manager phê duyệt tuyển dụng";
      await roleRepository.save(recruitmentManagerRole);
    } else {
      console.log(`Creating new role '${RoleType.RECRUITMENT_MANAGER}'...`);
      recruitmentManagerRole = roleRepository.create({
        code: RoleType.RECRUITMENT_MANAGER,
        name: "Manager phê duyệt tuyển dụng",
      });
      await roleRepository.save(recruitmentManagerRole);
      console.log(
        `Role '${RoleType.RECRUITMENT_MANAGER}' created with ID: ${recruitmentManagerRole.id}`,
      );
    }

    // Map RECRUITMENT_MANAGER role to page (idempotent)
    const managerPageCode = "recruitment_manager_candidates";
    const managerPage = await pageRepository.findOne({
      where: { code: managerPageCode },
    });

    if (managerPage) {
      // Check if role-page mapping already exists
      const existingRolePage = await rolePageRepository.findOne({
        where: {
          roleId: recruitmentManagerRole.id,
          pageId: managerPage.id,
        },
      });

      if (existingRolePage) {
        console.log(
          `Role-page mapping already exists: ${RoleType.RECRUITMENT_MANAGER} -> ${managerPageCode}. Updating access level...`,
        );
        existingRolePage.accessLevel = AccessLevel.WRITE;
        await rolePageRepository.save(existingRolePage);
      } else {
        console.log(
          `Creating role-page mapping: ${RoleType.RECRUITMENT_MANAGER} -> ${managerPageCode}`,
        );
        const rolePage = rolePageRepository.create({
          roleId: recruitmentManagerRole.id,
          pageId: managerPage.id,
          accessLevel: AccessLevel.WRITE,
          createdAt: new Date(),
        });
        await rolePageRepository.save(rolePage);
      }

      console.log(
        `Role-page relationship saved: ${RoleType.RECRUITMENT_MANAGER} -> ${managerPageCode}`,
      );
    }

    // Add "Quản lý Manager" page to RECRUITMENT_MANAGEMENT role
    const recruitmentManagementRole = await roleRepository.findOne({
      where: { code: RoleType.RECRUITMENT_MANAGEMENT },
    });

    if (!recruitmentManagementRole) {
      console.warn(
        "Warning: RECRUITMENT_MANAGEMENT role not found. Please run recruitment-management-role seed first.",
      );
    } else {
      const managementPageCode = "recruitment_manager_management";
      const managementPage = await pageRepository.findOne({
        where: { code: managementPageCode },
      });

      if (managementPage) {
        // Check if role-page mapping already exists
        const existingRolePage = await rolePageRepository.findOne({
          where: {
            roleId: recruitmentManagementRole.id,
            pageId: managementPage.id,
          },
        });

        if (existingRolePage) {
          console.log(
            `Role-page mapping already exists: ${RoleType.RECRUITMENT_MANAGEMENT} -> ${managementPageCode}. Updating access level...`,
          );
          existingRolePage.accessLevel = AccessLevel.WRITE;
          await rolePageRepository.save(existingRolePage);
        } else {
          console.log(
            `Creating role-page mapping: ${RoleType.RECRUITMENT_MANAGEMENT} -> ${managementPageCode}`,
          );
          const rolePage = rolePageRepository.create({
            roleId: recruitmentManagementRole.id,
            pageId: managementPage.id,
            accessLevel: AccessLevel.WRITE,
            createdAt: new Date(),
          });
          await rolePageRepository.save(rolePage);
        }

        console.log(
          `Role-page relationship saved: ${RoleType.RECRUITMENT_MANAGEMENT} -> ${managementPageCode}`,
        );
      }
    }

    console.log("Recruitment manager role seeded successfully!");
  }
}
