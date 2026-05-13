import * as fs from "fs";
import * as path from "path";
import { DataSource } from "typeorm";
import { Seeder } from "typeorm-extension";
import { Seedings } from "../../entities/seedings";

export class MainSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    console.log("Running database seeds");

    const seedingRepository = dataSource.getRepository(Seedings);
    const seedDir = path.resolve(__dirname);

    const files = fs
      .readdirSync(seedDir)
      .filter(
        (file) =>
          (file.endsWith(".seed.ts") || file.endsWith(".seed.js")) &&
          file !== "main.seed.ts" &&
          file !== "main.seed.js"
      )
      .sort();

    for (const file of files) {
      const filePath = path.join(seedDir, file);

      const check = await seedingRepository.findOne({
        where: { name: file },
      });

      if (check) {
        console.log(`${filePath} already seeded, skipping...`);
        continue;
      }

      const seedModule = await import(filePath);

      const SeederClass = [
        seedModule.default,
        ...Object.values(seedModule),
      ].find(
        (value: any) =>
          typeof value === "function" &&
          value.prototype &&
          typeof value.prototype.run === "function"
      );

      if (!SeederClass) {
        throw new Error(`Seeder class not found in file: ${filePath}`);
      }

      console.log(`Running ${filePath}...`);

      const seeder = new (SeederClass as any)();
      await seeder.run(dataSource);

      const seeding = new Seedings();
      seeding.name = file;
      await seedingRepository.save(seeding);
    }

    console.log("All seeds executed successfully.");
  }
}