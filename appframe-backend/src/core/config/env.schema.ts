import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Ambiente e Aplicação
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5174'),

  // Banco de Dados (PostgreSQL)
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().default('postgres'),
  DB_DATABASE: Joi.string().default('appframe'),
  DB_SYNCHRONIZE: Joi.string().valid('true', 'false').default('false'),
  DB_MIGRATIONS_RUN: Joi.string().valid('true', 'false').default('true'),
  DB_SSL: Joi.string().valid('true', 'false').default('false'),

  // JWT e Sessões
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('30d'),
  COOKIE_SECURE: Joi.string().valid('true', 'false').default('false'),
  SUPER_ADMIN_EMAIL: Joi.string().email().optional().allow(''),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),

  // Google OAuth
  GOOGLE_CLIENT_ID: Joi.string().optional().allow(''),
  GOOGLE_CLIENT_SECRET: Joi.string().optional().allow(''),
  GOOGLE_CALLBACK_URL: Joi.string()
    .uri()
    .optional()
    .allow('')
    .default('http://localhost:3000/api/v1/auth/google/callback'),

  // Google Gemini AI
  GEMINI_MODEL: Joi.string().default('gemini-3.5-flash'),
});
