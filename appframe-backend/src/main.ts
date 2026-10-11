import { NestFactory, Reflector } from '@nestjs/core';
import {
  ValidationPipe,
  ClassSerializerInterceptor,
  Logger,
} from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './core/filters/all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Parser de Cookies para autenticação segura via HttpOnly
  const cookieMiddleware =
    typeof cookieParser === 'function'
      ? cookieParser
      : (cookieParser as any).default || require('cookie-parser');
  app.use(cookieMiddleware());

  // Configuração global de CORS com origem explícita para suporte a credentials: true
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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

  // Blindagem de Saída: Oculta campos com @Exclude() e filtra serialização
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Blindagem de Infraestrutura: Captura e sanitiza todas as exceções (SQL, TypeORM, 500)
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 AppFrame Backend rodando com sucesso na porta: ${port}`);
  logger.log(`🛡️ Camadas globais de blindagem e sanitização ativadas.`);
}

bootstrap();
