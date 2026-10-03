export const CONFIG_KEYS = {
  NODE_ENV: 'NODE_ENV',
  PORT: 'PORT',
  CORS_ORIGIN: 'CORS_ORIGIN',
  DB_HOST: 'DB_HOST',
  DB_PORT: 'DB_PORT',
  DB_USER: 'DB_USER',
  DB_PASSWORD: 'DB_PASSWORD',
  DB_NAME: 'DB_NAME',
  DB_LOGGING: 'DB_LOGGING',
  JWT_SECRET: 'JWT_SECRET',
  REFRESH_TOKEN_SECRET: 'REFRESH_TOKEN_SECRET',
} as const;

export const CONFIG_DEFAULTS = {
  NODE_ENV: 'development',
  PORT: 3001,
  CORS_ORIGIN: 'http://localhost:3000',
  DB_HOST: 'localhost',
  DB_PORT: 5432,
  DB_USER: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_NAME: 'igreja_escala',
} as const;

export const PRODUCTION_ENV = 'production';

export const ENV_FILE_PATH = '.env';
