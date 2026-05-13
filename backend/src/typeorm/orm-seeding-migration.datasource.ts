import { DataSource, DataSourceOptions } from "typeorm";
import { SeederOptions } from "typeorm-extension";
import { config } from "../config/config";
import { MainSeeder } from "../database/seeds/main.seed";

const options: DataSourceOptions & SeederOptions = {
  type: config.get("typeorm.type"),
  database: config.get("typeorm.database"),
  host: config.get("typeorm.host"),
  port: Number(config.get("typeorm.port")),
  username: config.get("typeorm.username"),
  password: config.get("typeorm.password"),
  logging: config.get("typeorm.logging"),
  synchronize: config.get("typeorm.synchronize"),
  entities: [__dirname + "/../entities/*{.ts,.js}"],
  migrations: [__dirname + "/../migrations/**/*{.ts,.js}"],
  seeds: [MainSeeder],
};

const seedingDataSource = new DataSource(options);

export default seedingDataSource;