import { ConfigService } from '@nestjs/config';

/** Secrets have no safe fallback: fail at bootstrap instead of signing tokens with a default. */
export function requireConfigValue(configService: ConfigService, key: string): string {
  const value = configService.get<string>(key);

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}
