import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', 1);
  app.use(helmet());
  app.enableShutdownHooks();

  // Parser de Cookies para autenticação segura via HttpOnly
  app.use(cookieParser());

  // Suporte a payloads de imagens pré-renderizadas de alta resolução (PNG transparentes do Canvas)
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ limit: '25mb', extended: true }));

  // Configuração global de CORS com origem explícita para suporte a credentials: true
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const allowedOrigins = Array.from(
    new Set([
      frontendUrl,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ]),
  );

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Prefixo global para a API
  app.setGlobalPrefix('api/v1');

  // Blindagem de Entrada: Rejeita propriedades extras e transforma tipos
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 AppFrame Backend rodando com sucesso na porta: ${port}`);
  logger.log(`🛡️ Camadas globais de blindagem e sanitização ativadas.`);
}

bootstrap();
