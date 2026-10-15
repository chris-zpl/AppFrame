import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor, NotFoundException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
const request = require('supertest');
import { WatermarksController } from '../src/modules/watermarks/watermarks.controller';
import { WatermarksService } from '../src/modules/watermarks/watermarks.service';
import { MediaController } from '../src/modules/media/media.controller';
import { MediaService } from '../src/modules/media/media.service';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';
import { AllExceptionsFilter } from '../src/core/filters/all-exceptions.filter';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { UserRole } from '../src/modules/users/enums/user-role.enum';

describe('2. Testes de Controle de Acesso e IDOR (E2E)', () => {
  let app: INestApplication;

  const userA = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'usera@appframe.io',
    sessionId: '33333333-3333-4333-8333-333333333333',
    role: UserRole.USER,
  };

  const userB = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'userb@appframe.io',
    sessionId: '44444444-4444-4444-8444-444444444444',
    role: UserRole.USER,
  };

  const adminUser = {
    id: '99999999-9999-4999-8999-999999999999',
    email: 'christian.zimpel@gmail.com',
    sessionId: '55555555-5555-4555-8555-555555555555',
    role: UserRole.SUPER_ADMIN,
  };

  let currentUserContext = userB;

  const watermarkUserA = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    user_id: userA.id,
    original_name: 'logo-usera.png',
  };

  const jobUserA = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    user_id: userA.id,
    title: 'Video Job User A',
  };

  const mockWatermarksService = {
    findById: jest.fn().mockImplementation((id: string, userId: string) => {
      if (id === watermarkUserA.id && userId !== userA.id) {
        throw new NotFoundException('Marca d’água não encontrada.');
      }
      return watermarkUserA;
    }),
    findByUser: jest.fn().mockImplementation((userId: string) => {
      if (userId === userA.id) return [watermarkUserA];
      return [];
    }),
    delete: jest.fn().mockImplementation((id: string, userId: string) => {
      if (id === watermarkUserA.id && userId !== userA.id) {
        throw new NotFoundException('Marca d’água não encontrada.');
      }
      return true;
    }),
  };

  const mockMediaService = {
    getJobById: jest.fn().mockImplementation((id: string, userId: string) => {
      if (id === jobUserA.id && userId !== userA.id) {
        throw new NotFoundException('Job de vídeo não encontrado.');
      }
      return jobUserA;
    }),
    createJob: jest.fn().mockImplementation((userId: string, dto: any) => {
      if (dto.watermark_id && dto.watermark_id === watermarkUserA.id && userId !== userA.id) {
        throw new NotFoundException('Marca d’água não encontrada.');
      }
      return {
        id: 'j2222222-2222-2222-2222-222222222222',
        user_id: userId,
        ...dto,
      };
    }),
    listUserJobs: jest.fn().mockImplementation((userId: string) => {
      if (userId === userA.id) return [jobUserA];
      return [];
    }),
    getYouTubeCookiesStatus: jest.fn().mockReturnValue({ configured: true, path: '/tmp/cookies.txt', updatedAt: new Date().toISOString() }),
    saveYouTubeCookies: jest.fn().mockReturnValue({ success: true, message: 'Cookies salvos' }),
    deleteYouTubeCookies: jest.fn().mockReturnValue({ success: true, message: 'Cookies removidos' }),
  };

  const mockAuthService = {
    revokeSession: jest.fn().mockImplementation((userId: string, sessionId: string) => {
      if (sessionId === userA.sessionId && userId !== userA.id) {
        throw new NotFoundException('Sessão não encontrada.');
      }
      return { revoked: true };
    }),
  };

  const mockUsersService = {
    getUserProfile: jest.fn().mockImplementation((id: string) => {
      if (id === userA.id) {
        return { id: userA.id, email: userA.email, name: 'User A', role: UserRole.USER };
      }
      return { id: userB.id, email: userB.email, name: 'User B', role: UserRole.USER };
    }),
    getUserSessions: jest.fn().mockImplementation((id: string) => {
      if (id === userA.id) {
        return [{ id: userA.sessionId, user_id: userA.id, ip_address: '1.2.3.4' }];
      }
      return [{ id: userB.sessionId, user_id: userB.id, ip_address: '5.6.7.8' }];
    }),
    revokeSession: jest.fn().mockImplementation((sessionId: string, userId: string) => {
      if (sessionId === userA.sessionId && userId !== userA.id) {
        throw new NotFoundException('Sessão não encontrada.');
      }
      return true;
    }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [WatermarksController, MediaController, AuthController, UsersController],
      providers: [
        { provide: WatermarksService, useValue: mockWatermarksService },
        { provide: MediaService, useValue: mockMediaService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:5173') },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = {
            userId: currentUserContext.id,
            email: currentUserContext.email,
            sessionId: currentUserContext.sessionId,
            role: currentUserContext.role,
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('2.1 IDOR em Watermarks', () => {
    it('User B não deve conseguir consultar a marca d’água de User A via GET /watermarks/:id (404)', async () => {
      currentUserContext = userB;

      const res = await request(app.getHttpServer())
        .get(`/watermarks/${watermarkUserA.id}`)
        .expect(404);

      expect(res.body.message).toContain('Marca d’água não encontrada');
    });

    it('User B não deve conseguir excluir a marca d’água de User A via DELETE /watermarks/:id (404)', async () => {
      currentUserContext = userB;

      const res = await request(app.getHttpServer())
        .delete(`/watermarks/${watermarkUserA.id}`)
        .expect(404);

      expect(res.body.message).toContain('Marca d’água não encontrada');
    });

    it('User B não deve conseguir listar marcas d’água de User A via GET /watermarks/user/:userId (403)', async () => {
      currentUserContext = userB;

      const res = await request(app.getHttpServer())
        .get(`/watermarks/user/${userA.id}`)
        .expect(403);

      expect(res.body.message).toContain('Acesso negado');
    });

    it('User B não deve conseguir obter marca d’água de User A via GET /watermarks/:id/user/:userId (403)', async () => {
      currentUserContext = userB;

      const res = await request(app.getHttpServer())
        .get(`/watermarks/${watermarkUserA.id}/user/${userA.id}`)
        .expect(403);

      expect(res.body.message).toContain('Acesso negado');
    });

    it('User B não deve conseguir excluir marca d’água de User A via DELETE /watermarks/:id/user/:userId (403)', async () => {
      currentUserContext = userB;

      const res = await request(app.getHttpServer())
        .delete(`/watermarks/${watermarkUserA.id}/user/${userA.id}`)
        .expect(403);

      expect(res.body.message).toContain('Acesso negado');
    });
  });

  describe('2.2 IDOR em Media & Video Jobs', () => {
    it('User B não deve conseguir consultar jobs de vídeo de User A (404)', async () => {
      currentUserContext = userB;

      const res = await request(app.getHttpServer())
        .get(`/media/jobs/${jobUserA.id}`)
        .expect(404);

      expect(res.body.message).toContain('Job de vídeo não encontrado');
    });

    it('User B não deve conseguir criar jobs em nome de User A via POST /media/users/:userId/jobs (403)', async () => {
      currentUserContext = userB;

      const res = await request(app.getHttpServer())
        .post(`/media/users/${userA.id}/jobs`)
        .send({ source_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
        .expect(403);

      expect(res.body.message).toContain('Acesso negado');
    });

    it('User B não deve conseguir listar jobs de User A via GET /media/users/:userId/jobs (403)', async () => {
      currentUserContext = userB;

      const res = await request(app.getHttpServer())
        .get(`/media/users/${userA.id}/jobs`)
        .expect(403);

      expect(res.body.message).toContain('Acesso negado');
    });

    it('User B não deve conseguir obter job de User A via GET /media/users/:userId/jobs/:id (403)', async () => {
      currentUserContext = userB;

      const res = await request(app.getHttpServer())
        .get(`/media/users/${userA.id}/jobs/${jobUserA.id}`)
        .expect(403);

      expect(res.body.message).toContain('Acesso negado');
    });

    it('User B não deve conseguir usar a marca d’água de User A ao criar um job (404)', async () => {
      currentUserContext = userB;

      const res = await request(app.getHttpServer())
        .post('/media/jobs')
        .send({
          source_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          watermark_id: watermarkUserA.id,
        })
        .expect(404);

      expect(res.body.message).toContain('Marca d’água não encontrada');
    });
  });

  describe('2.3 IDOR em Sessões & Autenticação', () => {
    it('User B não deve conseguir revogar sessões ativas de User A via /auth/sessions/:id (404)', async () => {
      currentUserContext = userB;

      const res = await request(app.getHttpServer())
        .delete(`/auth/sessions/${userA.sessionId}`)
        .expect(404);

      expect(res.body.message).toContain('Sessão não encontrada');
    });
  });

  describe('2.4 IDOR em Usuários (UsersController)', () => {
    it('User B não deve conseguir visualizar perfil de User A via GET /users/:id/profile (403)', async () => {
      currentUserContext = userB;

      const res = await request(app.getHttpServer())
        .get(`/users/${userA.id}/profile`)
        .expect(403);

      expect(res.body.message).toContain('Acesso negado aos dados de outro usuário');
    });

    it('User B não deve conseguir listar sessões de User A via GET /users/:id/sessions (403)', async () => {
      currentUserContext = userB;

      const res = await request(app.getHttpServer())
        .get(`/users/${userA.id}/sessions`)
        .expect(403);

      expect(res.body.message).toContain('Acesso negado às sessões de outro usuário');
    });

    it('User B não deve conseguir revogar sessão de User A via DELETE /users/:userId/sessions/:sessionId (403)', async () => {
      currentUserContext = userB;

      const res = await request(app.getHttpServer())
        .delete(`/users/${userA.id}/sessions/${userA.sessionId}`)
        .expect(403);

      expect(res.body.message).toContain('Acesso negado para revogar sessões de outro usuário');
    });

    it('User A consegue consultar seu próprio perfil via GET /users/:id/profile (200)', async () => {
      currentUserContext = userA;

      const res = await request(app.getHttpServer())
        .get(`/users/${userA.id}/profile`)
        .expect(200);

      expect(res.body.id).toBe(userA.id);
      expect(res.body.email).toBe(userA.email);
    });

    it('Super Admin consegue consultar perfil de outro usuário via GET /users/:id/profile (200)', async () => {
      currentUserContext = adminUser;

      const res = await request(app.getHttpServer())
        .get(`/users/${userA.id}/profile`)
        .expect(200);

      expect(res.body.id).toBe(userA.id);
    });
  });

  describe('2.5 Controle de Acesso Positivo', () => {
    it('User A consegue acessar seus próprios recursos (Watermarks e Jobs)', async () => {
      currentUserContext = userA;

      const watermarkRes = await request(app.getHttpServer())
        .get(`/watermarks/${watermarkUserA.id}`)
        .expect(200);

      expect(watermarkRes.body.id).toBe(watermarkUserA.id);

      const jobRes = await request(app.getHttpServer())
        .get(`/media/jobs/${jobUserA.id}`)
        .expect(200);

      expect(jobRes.body.id).toBe(jobUserA.id);
    });
  });
});
