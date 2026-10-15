import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
const request = require('supertest');
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { AllExceptionsFilter } from '../src/core/filters/all-exceptions.filter';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { UserSession } from '../src/modules/users/entities/user-session.entity';

describe('3. Ciclo de Vida de Sessões e Autenticação (E2E)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const testUserId = 'u3333333-3333-3333-3333-333333333333';
  const currentSessionId = 's3333333-3333-3333-3333-333333333333';
  const otherSessionId = 's4444444-4444-4444-4444-444444444444';

  const activeSessionsDb = new Map<string, any>([
    [
      currentSessionId,
      {
        id: currentSessionId,
        user_id: testUserId,
        is_revoked: false,
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    ],
    [
      otherSessionId,
      {
        id: otherSessionId,
        user_id: testUserId,
        is_revoked: false,
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    ],
  ]);

  const mockSessionRepo = {
    findOne: jest.fn().mockImplementation(({ where }: any) => {
      const sess = activeSessionsDb.get(where.id);
      if (sess && !sess.is_revoked) {
        return Promise.resolve(sess);
      }
      return Promise.resolve(null);
    }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockAuthService = {
    getSessions: jest.fn().mockResolvedValue([
      { id: currentSessionId, is_current: true },
      { id: otherSessionId, is_current: false },
    ]),
    revokeOtherSessions: jest.fn().mockImplementation((userId: string, sessionId: string) => {
      // Marca todas as outras sessões como revogadas
      for (const [id, s] of activeSessionsDb.entries()) {
        if (id !== sessionId && s.user_id === userId) {
          s.is_revoked = true;
        }
      }
      return { revokedCount: 1 };
    }),
    verify2faChallenge: jest.fn().mockImplementation((dto: any) => {
      if (dto.token === '999999' || dto.token === 'INVALID-REC-CODE') {
        throw new UnauthorizedException('Código de autenticação ou recuperação inválido.');
      }
      return {
        access_token: 'valid-jwt-token',
        user: { id: testUserId, email: 'user@appframe.io' },
      };
    }),
    logout: jest.fn().mockImplementation((tokenOrSessionId: string) => {
      for (const [id, s] of activeSessionsDb.entries()) {
        if (id === tokenOrSessionId) {
          s.is_revoked = true;
        }
      }
      return Promise.resolve({ loggedOut: true });
    }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'test-secret-key-32-chars-long-e2e',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, def?: any) => {
              if (key === 'JWT_SECRET') return 'test-secret-key-32-chars-long-e2e';
              return def;
            },
          },
        },
        { provide: getRepositoryToken(UserSession), useValue: mockSessionRepo },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              id: testUserId,
              email: 'user@appframe.io',
              is_active: true,
              role: 'USER',
            }),
          },
        },
        JwtStrategy,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    jwtService = moduleRef.get<JwtService>(JwtService);

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('3.1 Rejeição sem token - chamada protegida sem Header Authorization deve retornar 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/sessions')
      .expect(401);

    expect(res.body.statusCode).toBe(401);
  });

  it('3.2 Rejeição de token expirado - token expirado deve retornar 401', async () => {
    const expiredToken = jwtService.sign(
      { sub: testUserId, email: 'user@appframe.io', sessionId: currentSessionId },
      { expiresIn: '-1s' },
    );

    const res = await request(app.getHttpServer())
      .get('/auth/sessions')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);

    expect(res.body.statusCode).toBe(401);
  });

  it('3.3 Rejeição de token inválido - token com assinatura corrompida deve retornar 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/sessions')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.corrompido.fake')
      .expect(401);

    expect(res.body.statusCode).toBe(401);
  });

  it('3.4 POST /auth/sessions/revoke-others - revoga sessões secundárias e preserva a atual', async () => {
    const currentToken = jwtService.sign({
      sub: testUserId,
      email: 'user@appframe.io',
      sessionId: currentSessionId,
    });

    const otherToken = jwtService.sign({
      sub: testUserId,
      email: 'user@appframe.io',
      sessionId: otherSessionId,
    });

    // 1. Ambas funcionavam antes
    await request(app.getHttpServer())
      .get('/auth/sessions')
      .set('Authorization', `Bearer ${currentToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/auth/sessions')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);

    // 2. Dispara revogação de outras sessões a partir da sessão atual
    const revokeRes = await request(app.getHttpServer())
      .post('/auth/sessions/revoke-others')
      .set('Authorization', `Bearer ${currentToken}`)
      .expect(200);

    expect(revokeRes.body.revokedCount).toBe(1);

    // 3. A outra sessão é imediatamente rejeitada com 401
    await request(app.getHttpServer())
      .get('/auth/sessions')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(401);

    // 4. A sessão atual continua funcionando perfeitamente
    await request(app.getHttpServer())
      .get('/auth/sessions')
      .set('Authorization', `Bearer ${currentToken}`)
      .expect(200);
  });

  it('3.5 Bloqueio 2FA - código TOTP incorreto deve ser rejeitado com 401', async () => {
    const tempChallengeToken = jwtService.sign({
      sub: testUserId,
      purpose: '2fa_challenge',
    });

    const res = await request(app.getHttpServer())
      .post('/auth/2fa/verify')
      .send({
        tempToken: tempChallengeToken,
        token: '999999', // Código inválido
      })
      .expect(401);

    expect(res.body.message).toContain('inválido');
  });

  it('3.6 Bloqueio de Token Temporário de 2FA - token de desafio 2FA não pode acessar endpoints de negócio', async () => {
    const tempChallengeToken = jwtService.sign({
      sub: testUserId,
      purpose: '2fa_challenge',
    });

    // Tentativa de burlar 2FA usando o temp_token diretamente no header Bearer
    const res = await request(app.getHttpServer())
      .get('/auth/sessions')
      .set('Authorization', `Bearer ${tempChallengeToken}`)
      .expect(401);

    expect(res.body.message).toContain('desafio de 2FA primeiro');
  });

  it('3.7 Logout - deve revogar a sessão no banco e limpar cookies', async () => {
    const currentToken = jwtService.sign({
      sub: testUserId,
      email: 'user@appframe.io',
      sessionId: currentSessionId,
      purpose: 'access',
    });

    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${currentToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(mockAuthService.logout).toHaveBeenCalled();
  });
});
