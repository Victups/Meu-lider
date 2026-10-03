import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CONFIG_DEFAULTS, CONFIG_KEYS } from './common/constants';
import { AllExceptionsFilter } from './common/filters';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const corsOrigin =
    configService.get<string>(CONFIG_KEYS.CORS_ORIGIN) ?? CONFIG_DEFAULTS.CORS_ORIGIN;

  app.enableCors({
    origin: corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = Number(configService.get<string>(CONFIG_KEYS.PORT) ?? CONFIG_DEFAULTS.PORT);
  await app.listen(port);

  logger.log(`Server is running on http://localhost:${port}`);
}

bootstrap().catch((error: unknown) => {
  new Logger('Bootstrap').error('Failed to start server', error);
  process.exit(1);
});
