import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';

export default class RecruitmentPipelineSeed implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const existingCount = await queryRunner.query(
        `SELECT COUNT(*) as count FROM recruitment_pipeline`,
      );

      if (Number(existingCount[0].count) > 0) {
        console.log(
          'Recruitment pipeline data already exists, skipping seed...',
        );
        return;
      }

      await queryRunner.query(`
        INSERT INTO recruitment_pipeline (name, \`order\`, code, is_active)
        VALUES
          ('Tiếp nhận hồ sơ', 1, 'received_cv', 1),
          ('HR Scan', 2, 'hr_scan', 1),
          ('Test IQ Online', 3, 'iq_test', 1),
          ('Bộ phận chọn hồ sơ', 4, 'department_review', 1),
          ('Test offline/Chuyên môn', 5, 'technical_test', 1),
          ('Phỏng vấn vòng 1', 6, 'interview_round_1', 1),
          ('Phỏng vấn vòng 2', 7, 'interview_round_2', 1),
          ('Offer', 8, 'offer', 1),
          ('Nhận việc', 9, 'onboarding', 1),
          ('Loại', 10, 'fail', 1)
      `);

      console.log('✓ Recruitment pipeline seeded successfully!');
    } catch (error) {
      console.error('Error seeding recruitment pipeline:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}