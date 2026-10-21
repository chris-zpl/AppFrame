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

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [WatermarksController, MediaController, AuthController],
      providers: [
        { provide: WatermarksService, useValue: mockWatermarksService },
        { provide: MediaService, useValue: mockMediaService },
        { provide: AuthService, useValue: mockAuthService },
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
