import { Role } from "src/entities/role";
import { DataSource } from "typeorm";
import { Seeder, SeederFactoryManager } from "typeorm-extension";
import { AccessLevel } from "../../common/constants/constants";
import { Page } from "../../entities/page";
import { RolePage } from "../../entities/role-page";
import { RoleType } from "../../security";

export class RecruitmentManagerMyCandidatePageSeed implements Seeder {
  async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const pageRepository = dataSource.getRepository(Page);
    const roleRepository = dataSource.getRepository(Role);
    const rolePageRepository = dataSource.getRepository(RolePage);

    console.log("Starting recruitment manager my-candidate page seeding...");

    const pageData = {
      id: 92,
      parentId: 82, // Under QUẢN LÝ TUYỂN DỤNG
      code: "recruitment_manager_my_candidate",
      name: "Data ứng viên",
      path: "/recruitment/my-candidate",
      description:
        "Danh sách ứng viên thuộc manager dựa trên phòng ban, chuyên môn và techlead",
      hasChildren: false,
      isGroup: false,
      priority: 35,
    };

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
    console.log(`Page '${pageData.code}' saved successfully.`);

    // Find RECRUITMENT_MANAGER role
    const recruitmentManagerRole = await roleRepository.findOne({
      where: { code: RoleType.RECRUITMENT_MANAGER },
    });

    if (!recruitmentManagerRole) {
      console.warn(
        "Warning: RECRUITMENT_MANAGER role not found. Please run recruitment-manager-role seed first.",
      );
      return;
    }

    // Map role to page (idempotent)
    const existingRolePage = await rolePageRepository.findOne({
      where: {
        roleId: recruitmentManagerRole.id,
        pageId: page.id,
      },
    });

    if (existingRolePage) {
      console.log(
        `Role-page mapping already exists: ${RoleType.RECRUITMENT_MANAGER} -> ${pageData.code}. Updating access level...`,
      );
      existingRolePage.accessLevel = AccessLevel.WRITE;
      await rolePageRepository.save(existingRolePage);
    } else {
      console.log(
        `Creating role-page mapping: ${RoleType.RECRUITMENT_MANAGER} -> ${pageData.code}`,
      );
      const rolePage = rolePageRepository.create({
        roleId: recruitmentManagerRole.id,
        pageId: page.id,
        accessLevel: AccessLevel.WRITE,
        createdAt: new Date(),
      });
      await rolePageRepository.save(rolePage);
    }

    console.log(
      `Role-page relationship saved: ${RoleType.RECRUITMENT_MANAGER} -> ${pageData.code}`,
    );
    console.log("Recruitment manager my-candidate page seeded successfully!");
  }
}
