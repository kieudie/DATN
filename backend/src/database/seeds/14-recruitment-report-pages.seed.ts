import { DataSource } from "typeorm";
import { Seeder, SeederFactoryManager } from "typeorm-extension";
import { AccessLevel } from "../../common/constants/constants";
import { Page } from "../../entities/page";
import { Role } from "../../entities/role";
import { RolePage } from "../../entities/role-page";
import { RoleType } from "../../security";

export class RecruitmentReportPagesSeed implements Seeder {
  async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const pageRepository = dataSource.getRepository(Page);
    const roleRepository = dataSource.getRepository(Role);
    const rolePageRepository = dataSource.getRepository(RolePage);

    console.log("Starting recruitment report pages seeding...");

    const pages = [
      {
        id: 93,
        parentId: 82, // Under QUẢN LÝ TUYỂN DỤNG
        code: "recruitment_report",
        name: "Báo cáo",
        path: "/recruitment/report",
        description: "Trang báo cáo tuyển dụng",
        hasChildren: true,
        isGroup: false,
        priority: 36,
        role: RoleType.RECRUITMENT_MANAGEMENT,
      },
      {
        id: 94,
        parentId: 93, // Under Báo cáo
        code: "recruitment_report_overview",
        name: "Báo cáo tổng quan",
        path: "/recruitment/report/overview",
        description: "Báo cáo tổng quan tuyển dụng",
        hasChildren: false,
        isGroup: false,
        priority: 1,
        role: RoleType.RECRUITMENT_MANAGEMENT,
      },
      {
        id: 95,
        parentId: 93, // Under Báo cáo
        code: "recruitment_report_effectiveness",
        name: "Báo cáo hiệu quả tuyển dụng",
        path: "/recruitment/report/effectiveness",
        description:
          "Báo cáo hiệu quả tuyển dụng theo vị trí, cấp độ, phòng ban, nguồn, nhân viên tuyển dụng",
        hasChildren: false,
        isGroup: false,
        priority: 2,
        role: RoleType.RECRUITMENT_MANAGEMENT,
      },
      {
        id: 96,
        parentId: 93, // Under Báo cáo
        code: "recruitment_report_speed",
        name: "Báo cáo tốc độ tuyển dụng",
        path: "/recruitment/report/speed",
        description:
          "Báo cáo tốc độ tuyển dụng: time-to-hire, time-to-fill, time-in-stage",
        hasChildren: false,
        isGroup: false,
        priority: 3,
        role: RoleType.RECRUITMENT_MANAGEMENT,
      },
    ];

    // Find RECRUITMENT_MANAGEMENT role once
    const role = await roleRepository.findOne({
      where: { code: RoleType.RECRUITMENT_MANAGEMENT },
    });

    if (!role) {
      console.warn(
        "Role 'recruitment_management' not found. Please run recruitment-management-role seed first.",
      );
      return;
    }

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
         // id: pageData.id,
          parentId: pageData.parentId,
          code: pageData.code,
          name: pageData.name,
          path: pageData.path,
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

      // Reload to ensure we have the DB id (in case of upsert)
      const savedPage = await pageRepository.findOne({
        where: { code: pageData.code },
      });

      if (!savedPage) {
        console.warn(
          `Page '${pageData.code}' not found after save. Skipping role mapping.`,
        );
        continue;
      }

      // Upsert role-page mapping
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

    console.log("Recruitment report pages seeded successfully!");
  }
}
