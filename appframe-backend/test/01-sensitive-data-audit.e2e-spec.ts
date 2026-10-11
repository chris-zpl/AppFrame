import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
const request = require('supertest');
import { QueryFailedError } from 'typeorm';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';
import { AllExceptionsFilter } from '../src/core/filters/all-exceptions.filter';
import { ConfigService } from '@nestjs/config';

describe('1. Auditoria de Vazamento de Dados Sensíveis nos Endpoints (E2E)', () => {
  let app: INestApplication;

  const mockUser = {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Christian Audited',
    email: 'audit@appframe.io',
    password_hash: '$2b$12$SUPERSECRET_PASSWORD_HASH_THAT_MUST_NEVER_LEAK',
    totp_secret: 'ENC_SECRET_TOTP_KEY_PLAINTEXT_VAL_NEVER_LEAK',
    recovery_codes: ['CODE1', 'CODE2', 'CODE3'],
    auth_provider: 'local',
    is_two_factor_enabled: false,
    google_id: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockSession = {
    id: 'b0000000-0000-0000-0000-000000000001',
    user_id: mockUser.id,
    refresh_token_hash: 'HASHED_REFRESH_TOKEN_MUST_NEVER_LEAK',
    device_name: 'MacBook Pro',
    ip_address: '127.0.0.1',
    user_agent: 'Jest Test Agent',
    is_current: true,
    last_active_at: new Date(),
    created_at: new Date(),
  };

  const mockAuthService = {
    register: jest.fn().mockImplementation((dto) => ({
      access_token: 'fake-jwt-token',
      refresh_token: 'fake-refresh-token',
      user: {
        id: mockUser.id,
        name: dto.name,
        email: dto.email,
        auth_provider: 'local',
        is_two_factor_enabled: false,
        created_at: mockUser.created_at,
        updated_at: mockUser.updated_at,
      },
    })),
    login: jest.fn().mockImplementation(() => ({
      access_token: 'fake-jwt-token',
      refresh_token: 'fake-refresh-token',
      user: {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        auth_provider: 'local',
        is_two_factor_enabled: false,
        created_at: mockUser.created_at,
        updated_at: mockUser.updated_at,
      },
    })),
    getProfile: jest.fn().mockImplementation(() => ({
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
      auth_provider: 'local',
      is_two_factor_enabled: false,
      created_at: mockUser.created_at,
      updated_at: mockUser.updated_at,
    })),
    getSessions: jest.fn().mockImplementation(() => [
      {
        id: mockSession.id,
        device_name: mockSession.device_name,
        ip_address: mockSession.ip_address,
        is_current: true,
        last_active_at: mockSession.last_active_at,
        created_at: mockSession.created_at,
      },
    ]),
  };

  const mockUsersService = {
    getUserProfile: jest.fn().mockImplementation(() => mockAuthService.getProfile(mockUser.id)),
    getUserSessions: jest.fn().mockImplementation(() => mockAuthService.getSessions(mockUser.id)),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController, UsersController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:5173'),
          },
        },
      ],
    })
      .overrideGuard(require('../src/modules/auth/guards/jwt-auth.guard').JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { userId: mockUser.id, email: mockUser.email, sessionId: mockSession.id };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1.1 POST /auth/register - não deve vazar password_hash, totp_secret, recovery_codes ou refresh_token_hash', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Christian Test',
        email: 'register@appframe.io',
        password: 'Password$2026!',
      })
      .expect(201);

    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('password_hash');
    expect(bodyStr).not.toContain('totp_secret');
    expect(bodyStr).not.toContain('recovery_codes');
    expect(bodyStr).not.toContain('refresh_token_hash');
    expect(res.body.user).toBeDefined();
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('1.2 POST /auth/login - não deve vazar password_hash, totp_secret, recovery_codes ou refresh_token_hash', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'audit@appframe.io',
        password: 'Password$2026!',
      })
      .expect(200);

    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('password_hash');
    expect(bodyStr).not.toContain('totp_secret');
    expect(bodyStr).not.toContain('recovery_codes');
    expect(bodyStr).not.toContain('refresh_token_hash');
    expect(res.body.user).toBeDefined();
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('1.3 GET /auth/me - dados confidenciais NUNCA devem constar no perfil do usuário', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .expect(200);

    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('password_hash');
    expect(bodyStr).not.toContain('totp_secret');
    expect(bodyStr).not.toContain('recovery_codes');
    expect(bodyStr).not.toContain('refresh_token_hash');
    expect(res.body.password_hash).toBeUndefined();
    expect(res.body.totp_secret).toBeUndefined();
  });

  it('1.4 GET /auth/sessions - refresh_token_hash não deve constar na listagem de sessões', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/sessions')
      .expect(200);

    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('refresh_token_hash');
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].refresh_token_hash).toBeUndefined();
  });

  it('1.5 POST /users/register - dados confidenciais não devem vazar no endpoint legado', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/register')
      .send({
        name: 'Christian User Alias',
        email: 'alias@appframe.io',
        password: 'Password$2026!',
      })
      .expect(201);

    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('password_hash');
    expect(bodyStr).not.toContain('totp_secret');
    expect(bodyStr).not.toContain('recovery_codes');
    expect(bodyStr).not.toContain('refresh_token_hash');
  });

  it('1.6 AllExceptionsFilter - em ambiente de produção, oculta queries SQL, credenciais e stack traces', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    // Simula erro de banco com query SQL contendo dados confidenciais
    mockAuthService.getProfile.mockImplementationOnce(() => {
      throw new QueryFailedError(
        'SELECT * FROM users WHERE password_hash = "secret" AND totp_secret = "key"',
        [],
        new Error('syntax error at or near "SELECT"'),
      );
    });

    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .expect(HttpStatus.INTERNAL_SERVER_ERROR);

    process.env.NODE_ENV = originalEnv;

    const bodyStr = JSON.stringify(res.body);
    expect(res.body.statusCode).toBe(500);
    expect(res.body.error).toBe('DatabaseError');
    expect(res.body.message).toBe('Erro durante a persistência de dados.');
    // Garante que query SQL e detalhes internos NÃO foram expostos ao cliente
    expect(bodyStr).not.toContain('password_hash');
    expect(bodyStr).not.toContain('totp_secret');
    expect(bodyStr).not.toContain('SELECT * FROM');
    expect(res.body.debug).toBeUndefined();
  });
});
