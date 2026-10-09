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
  DB_SSL: 'DB_SSL',
  JWT_SECRET: 'JWT_SECRET',
  REFRESH_TOKEN_SECRET: 'REFRESH_TOKEN_SECRET',
  APP_TIMEZONE: 'APP_TIMEZONE',
  SMTP_HOST: 'SMTP_HOST',
  SMTP_PORT: 'SMTP_PORT',
  SMTP_USER: 'SMTP_USER',
  SMTP_PASSWORD: 'SMTP_PASSWORD',
  MAIL_FROM: 'MAIL_FROM',
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
  APP_TIMEZONE: 'America/Sao_Paulo',
  MAIL_FROM: 'Igreja Escala <no-reply@igrejaescala.app>',
} as const;

export const PRODUCTION_ENV = 'production';

export const ENV_FILE_PATH = '.env';
