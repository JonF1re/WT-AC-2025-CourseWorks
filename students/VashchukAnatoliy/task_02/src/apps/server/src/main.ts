import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { createLogger } from './common/logger/winston.config';

async function bootstrap() {
  // Загружаем .env до старта приложения
  dotenv.config();

  const app = await NestFactory.create(AppModule, {
    logger: createLogger(),
  });

  app.use(helmet());
  app.use(cors());

  // ✅ ГЛОБАЛЬНЫЙ EXCEPTION FILTER
  app.useGlobalFilters(new HttpExceptionFilter());

  // ✅ ГЛОБАЛЬНАЯ ВАЛИДАЦИЯ DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // удаляет лишние поля
      forbidNonWhitelisted: true, // ошибка, если передали лишние поля
      transform: true, // DTO -> class
    }),
  );

  // Глобальный префикс
  app.setGlobalPrefix('api');

  // --- Swagger ---
  const config = new DocumentBuilder()
    .setTitle('Micro Twitter API')
    .setDescription('Coursework API — «Мысли вслух»')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  // --- Swagger ---

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Server started on http://localhost:${port}`);
  console.log(`📚 Swagger available at http://localhost:${port}/api/docs`);
}

void bootstrap();
