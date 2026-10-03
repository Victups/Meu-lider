import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CONFIG_DEFAULTS, CONFIG_KEYS } from '../common/constants';

export function buildTypeOrmOptions(configService: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: configService.get<string>(CONFIG_KEYS.DB_HOST) ?? CONFIG_DEFAULTS.DB_HOST,
    port: Number(configService.get<string>(CONFIG_KEYS.DB_PORT) ?? CONFIG_DEFAULTS.DB_PORT),
    username: configService.get<string>(CONFIG_KEYS.DB_USER) ?? CONFIG_DEFAULTS.DB_USER,
    password: configService.get<string>(CONFIG_KEYS.DB_PASSWORD) ?? CONFIG_DEFAULTS.DB_PASSWORD,
    database: configService.get<string>(CONFIG_KEYS.DB_NAME) ?? CONFIG_DEFAULTS.DB_NAME,
    // Migrations own the schema in every environment; synchronize would drop
    // and recreate columns on rename, taking the data with them.
    synchronize: false,
    migrationsRun: true,
    migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
    logging: configService.get<string>(CONFIG_KEYS.DB_LOGGING) === 'true',
    // Entities come from the TypeOrmModule.forFeature() registrations, so no path globs
    // that would break once the app runs from dist/.
    autoLoadEntities: true,
  };
}
