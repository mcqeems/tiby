import { NestFactory, Reflector } from '@nestjs/core';
import {
  BadRequestException,
  StandardSchemaValidationPipe,
  StandardSchemaSerializerInterceptor,
} from '@nestjs/common';
import { AppModule } from './app.module.js';
import { ApiErrorExceptionFilter } from './common/filters/api-error-exception.filter.js';
import { methods } from 'better-auth/client';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.enableCors({
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new StandardSchemaValidationPipe({
      validateCustomDecorators: true,
      exceptionFactory: (issues) =>
        new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Validation failed',
          details: issues.map((i) => ({
            path:
              i.path
                ?.map((s) => (typeof s === 'object' ? s.key : s))
                .join('.') ?? '',
            message: i.message,
          })),
        }),
    }),
  );

  app.useGlobalInterceptors(
    new StandardSchemaSerializerInterceptor(app.get(Reflector)),
  );
  app.useGlobalFilters(new ApiErrorExceptionFilter());

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}
await bootstrap();
