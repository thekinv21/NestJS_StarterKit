import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import helmet from 'helmet';

import { AppModule } from '@/app';

import { AppConfigService } from '@/infrastructure/config';
import { setupSwagger } from '@/infrastructure/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);

  app.use(helmet());

  app.setGlobalPrefix('/api');

  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.enableShutdownHooks();

  if (!config.isProduction) {
    setupSwagger(app);
  }

  const port = config.get('PORT');
  await app.listen(port);

  if (!config.isProduction) {
    Logger.debug(`Swagger UI running on host: http://localhost:${port}/docs`);
  }
}
void bootstrap();
