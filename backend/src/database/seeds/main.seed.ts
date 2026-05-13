import dataSource from '../../typeorm/orm.datasource';
import { RoleSeed } from './01-role.seed';
import { UserSeed } from './02-user.seed';
import { PageSeed } from './03-page.seed';
import { RolePageSeed } from './04-role-page.seed';
import RecruitmentPipelineSeed from './05-recruitment-pipeline.seed';

async function main() {
  await dataSource.initialize();

  const roleSeed = new RoleSeed();
  const userSeed = new UserSeed();
  const pageSeed = new PageSeed();
  const rolePageSeed = new RolePageSeed();
  const recruitmentPipelineSeed = new RecruitmentPipelineSeed();

  await roleSeed.run(dataSource, null as any);
  await userSeed.run(dataSource, null as any);
  await pageSeed.run(dataSource, null as any);
  await rolePageSeed.run(dataSource, null as any);
  await recruitmentPipelineSeed.run(dataSource);

  console.log('Seed data successfully');
}

main()
  .catch((error) => {
    console.error('Seed data failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });