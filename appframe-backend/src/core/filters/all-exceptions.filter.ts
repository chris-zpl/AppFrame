import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { TypeORMError, QueryFailedError } from 'typeorm';
import * as crypto from 'crypto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    if (response.headersSent) {
      return;
    }
    const request = ctx.getRequest<Request>();
    const isProduction = process.env.NODE_ENV === 'production';
    const errorId = crypto.randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Ocorreu um erro interno no servidor.';
    let errorType = 'InternalServerError';
    let validationErrors: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resObj = exceptionResponse as Record<string, any>;
        message = resObj.message || exception.message;
        errorType = resObj.error || exception.name;
        if (Array.isArray(resObj.message)) {
          validationErrors = resObj.message;
          message = 'Falha na validação dos dados de entrada.';
        }
      } else {
        message = exceptionResponse;
        errorType = exception.name;
      }

      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(
          `[${errorId}] HttpException (${status}): ${exception.message}`,
          exception.stack,
        );
      }
    } else if (exception instanceof QueryFailedError) {
      // Tratamento defensivo de erros SQL/TypeORM
      const driverError = (exception as any).driverError;
      const code = driverError?.code;

      if (code === '23505') {
        // PostgreSQL: unique_violation
        status = HttpStatus.CONFLICT;
        message = 'Conflito de dados: um registro com essas informações já existe.';
        errorType = 'ConflictError';
      } else if (code === '23503') {
        // PostgreSQL: foreign_key_violation
        status = HttpStatus.BAD_REQUEST;
        message = 'Registro relacionado não encontrado ou inválido.';
        errorType = 'ForeignKeyConstraintError';
      } else if (code === '23502') {
        // PostgreSQL: not_null_violation
        status = HttpStatus.BAD_REQUEST;
        message = 'Dados incompletos: campo obrigatório não informado.';
        errorType = 'NotNullConstraintError';
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = isProduction
          ? 'Erro durante a persistência de dados.'
          : (exception as Error).message;
        errorType = 'DatabaseError';
      }

      this.logger.error(
        `[${errorId}] Database Error: ${(exception as any).message}`,
        (exception as any).stack,
      );
    } else if (exception instanceof TypeORMError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = isProduction
        ? 'Erro interno na camada de dados.'
        : (exception as Error).message;
      errorType = 'DatabaseError';

      this.logger.error(
        `[${errorId}] TypeORM Error: ${(exception as any).message}`,
        (exception as any).stack,
      );
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = isProduction
        ? 'Ocorreu um erro interno no processamento da solicitação.'
        : exception.message;
      errorType = exception.name || 'InternalServerError';

      this.logger.error(
        `[${errorId}] Unhandled Error: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(
        `[${errorId}] Unknown Exception: ${JSON.stringify(exception)}`,
      );
    }

    // Se o erro ocorreu durante o callback OAuth do Google, redireciona amigavelmente para o frontend
    if (request.url?.includes('/auth/google/callback')) {
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      const state = request.query?.state as string;
      const target = state ? `${frontendUrl}/settings` : `${frontendUrl}/login`;
      const errText = encodeURIComponent(
        typeof message === 'string'
          ? message
          : 'Autenticação com o Google cancelada ou não autorizada.',
      );
      return response.redirect(`${target}?error=${errText}`);
    }

    // Resposta sanitizada entregue ao cliente HTTP
    const responsePayload: Record<string, any> = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      errorId,
      error: errorType,
      message,
    };

    if (validationErrors) {
      responsePayload.validationErrors = validationErrors;
    }

    // Apenas em ambiente de desenvolvimento expomos detalhes de depuração
    if (!isProduction && exception instanceof Error && status >= 500) {
      responsePayload.debug = {
        name: exception.name,
        stack: exception.stack?.split('\n').map((line) => line.trim()),
      };
    }

    response.status(status).json(responsePayload);
  }
}
