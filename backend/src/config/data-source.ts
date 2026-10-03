import { DataSource, DataSourceOptions } from 'typeorm';
import { CONFIG_DEFAULTS, ENV_FILE_PATH } from '../common/constants';

// The TypeORM CLI boots outside the Nest container, so ConfigModule is unavailable here.
// Node's built-in loader covers it without pulling dotenv in as a dependency.
try {
  process.loadEnvFile(ENV_FILE_PATH);
} catch {
  // .env is optional: deployed environments inject the variables directly.
}

const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? CONFIG_DEFAULTS.DB_HOST,
  port: Number(process.env.DB_PORT ?? CONFIG_DEFAULTS.DB_PORT),
  username: process.env.DB_USER ?? CONFIG_DEFAULTS.DB_USER,
  password: process.env.DB_PASSWORD ?? CONFIG_DEFAULTS.DB_PASSWORD,
  database: process.env.DB_NAME ?? CONFIG_DEFAULTS.DB_NAME,
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/**/*.ts'],
};

export default new DataSource(dataSourceOptions);
