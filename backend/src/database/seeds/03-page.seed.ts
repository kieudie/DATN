import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { Page } from '../../entities/page';

export class PageSeed implements Seeder {
  async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const pageRepository = dataSource.getRepository(Page);

    const pages = [
      {
        id: 1,
        parentId: null,
        code: 'home',
        name: 'Trang chủ',
        path: '/home',
        description: 'Trang chủ',
        hasChildren: 0,
        isGroup: 0,
        priority: 0,
      },
      {
        id: 82,
        parentId: null,
        code: 'recruitment_management',
        name: 'QUẢN LÝ TUYỂN DỤNG',
        path: '/recruitment',
        description: 'Quản lý quy trình tuyển dụng và ứng viên',
        hasChildren: 1,
        isGroup: 1,
        priority: 27,
      },
      {
        id: 83,
        parentId: 82,
        code: 'recruitment_candidate_list',
        name: 'Thông tin ứng viên',
        path: '/recruitment/candidates',
        description:
          'HR xem, tìm kiếm, lọc và quản lý thông tin ứng viên trong kho ứng viên',
        hasChildren: 0,
        isGroup: 0,
        priority: 28,
      },
      {
        id: 84,
        parentId: 82,
        code: 'recruitment_pipeline',
        name: 'Quản lý quy trình tuyển dụng',
        path: '/recruitment/pipeline',
        description:
          'HR quản lý quy trình tuyển dụng với giao diện Kanban ứng viên',
        hasChildren: 0,
        isGroup: 0,
        priority: 29,
      },
      {
        id: 86,
        parentId: 82,
        code: 'recruitment_manager_candidates',
        name: 'Ứng viên của tôi',
        path: '/recruitment/my-candidates',
        description:
          'Manager xem danh sách ứng viên được HR phân bổ hoặc thuộc phạm vi xử lý của mình',
        hasChildren: 0,
        isGroup: 0,
        priority: 30,
      },
      {
        id: 87,
        parentId: 82,
        code: 'recruitment_manager_management',
        name: 'Quản lý Manager',
        path: '/recruitment/managers',
        description:
          'HR quản lý danh sách Manager tham gia quy trình tuyển dụng',
        hasChildren: 0,
        isGroup: 0,
        priority: 31,
      },
      {
        id: 89,
        parentId: 82,
        code: 'recruitment_order_manager',
        name: 'Thông tin Order',
        path: '/recruitment/orders/manager',
        description:
          'Manager tạo và theo dõi các order tuyển dụng thuộc phạm vi của mình',
        hasChildren: 0,
        isGroup: 0,
        priority: 32,
      },
      {
        id: 90,
        parentId: 82,
        code: 'recruitment_order_management',
        name: 'Thông tin Order',
        path: '/recruitment/orders/management',
        description:
          'HR xem và xử lý danh sách order tuyển dụng do Manager gửi',
        hasChildren: 0,
        isGroup: 0,
        priority: 33,
      },
      {
        id: 91,
        parentId: 82,
        code: 'recruitment_order_pipeline',
        name: 'Quản lý quy trình Order',
        path: '/recruitment/orders/pipeline',
        description:
          'HR quản lý quy trình order tuyển dụng theo Kanban',
        hasChildren: 0,
        isGroup: 0,
        priority: 34,
      },
      {
        id: 92,
        parentId: 82,
        code: 'recruitment_manager_my_candidate',
        name: 'Thông tin ứng viên',
        path: '/recruitment/my-candidate',
        description:
          'Manager xem thông tin ứng viên thuộc phạm vi phụ trách',
        hasChildren: 0,
        isGroup: 0,
        priority: 35,
      },
      {
        id: 93,
        parentId: 82,
        code: 'recruitment_report',
        name: 'Báo cáo',
        path: '/recruitment/report',
        description: 'HR xem báo cáo và thống kê tuyển dụng',
        hasChildren: 1,
        isGroup: 0,
        priority: 36,
      },
      {
        id: 94,
        parentId: 93,
        code: 'recruitment_report_overview',
        name: 'Báo cáo tổng quan',
        path: '/recruitment/report/overview',
        description: 'Báo cáo tổng quan và phễu chuyển đổi tuyển dụng',
        hasChildren: 0,
        isGroup: 0,
        priority: 1,
      },
      {
        id: 95,
        parentId: 93,
        code: 'recruitment_report_effectiveness',
        name: 'Báo cáo hiệu quả tuyển dụng',
        path: '/recruitment/report/effectiveness',
        description:
          'Báo cáo hiệu quả tuyển dụng theo vị trí, level, phòng ban, nguồn và HR PIC',
        hasChildren: 0,
        isGroup: 0,
        priority: 2,
      },
      {
        id: 96,
        parentId: 93,
        code: 'recruitment_report_speed',
        name: 'Báo cáo tốc độ tuyển dụng',
        path: '/recruitment/report/speed',
        description:
          'Báo cáo tốc độ tuyển dụng, time-to-fill, days in stage và điểm nghẽn',
        hasChildren: 0,
        isGroup: 0,
        priority: 3,
      },
    ];

    console.log('Seeding pages...');

    for (const pageData of pages) {
      const existedPage = await pageRepository.findOne({
        where: {
          code: pageData.code,
        },
      });

      if (existedPage) {
        existedPage.parentId = pageData.parentId;
        existedPage.name = pageData.name;
        existedPage.path = pageData.path;
        existedPage.description = pageData.description;
        existedPage.hasChildren = pageData.hasChildren;
        existedPage.isGroup = pageData.isGroup;
        existedPage.priority = pageData.priority;

        await pageRepository.save(existedPage);

        console.log(`Updated page: ${pageData.code}`);
        continue;
      }

      const page = pageRepository.create(pageData);

      await pageRepository.save(page);

      console.log(`Created page: ${pageData.code}`);
    }

    console.log('Pages seeded successfully!');
  }
}