import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { UserRole } from '../src/modules/users/enums/user-role.enum';
import { AdminUsersService } from '../src/modules/admin/services/admin-users.service';
import { AdminSettingsService } from '../src/modules/admin/services/admin-settings.service';
import { GeminiService } from '../src/modules/gemini/gemini.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { UserSession } from '../src/modules/users/entities/user-session.entity';
import { VideoJob } from '../src/modules/media/entities/video-job.entity';
import { SystemSetting } from '../src/modules/admin/entities/system-setting.entity';
import { EncryptionService } from '../src/core/security/encryption.service';
import { DownloadService } from '../src/modules/media/services/download.service';
import { ConfigService } from '@nestjs/config';

describe('7. Admin RBAC, Gestão de Usuários, Configurações Globais e Tratamento de Cota Gemini', () => {
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  const createMockContext = (user: any): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext);

  describe('7.1 RBAC e RolesGuard', () => {
    it('deve permitir acesso a rota com @Roles(SUPER_ADMIN) apenas para SUPER_ADMIN ou christian.zimpel@gmail.com', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.SUPER_ADMIN]);

      // Usuário comum deve ser bloqueado
      expect(() =>
        rolesGuard.canActivate(
          createMockContext({ id: 'u1', email: 'user@appframe.io', role: UserRole.USER })
        )
      ).toThrow(ForbiddenException);

      // Administrador comum não pode acessar configurações de SUPER_ADMIN
      expect(() =>
        rolesGuard.canActivate(
          createMockContext({ id: 'u2', email: 'admin@appframe.io', role: UserRole.ADMIN })
        )
      ).toThrow(ForbiddenException);

      // SUPER_ADMIN tem acesso liberado
      expect(
        rolesGuard.canActivate(
          createMockContext({ id: 'u3', email: 'super@appframe.io', role: UserRole.SUPER_ADMIN })
        )
      ).toBe(true);

      // christian.zimpel@gmail.com sempre tem acesso liberado garantido
      expect(
        rolesGuard.canActivate(
          createMockContext({ id: 'u0', email: 'christian.zimpel@gmail.com', role: UserRole.USER })
        )
      ).toBe(true);
    });

    it('deve permitir acesso a rotas de gestão de usuários para SUPER_ADMIN e ADMIN, mas não para USER', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.SUPER_ADMIN, UserRole.ADMIN]);

      // Usuário comum deve ser rejeitado com 403 Forbidden
      expect(() =>
        rolesGuard.canActivate(
          createMockContext({ id: 'u1', email: 'user@appframe.io', role: UserRole.USER })
        )
      ).toThrow(ForbiddenException);

      // ADMIN tem acesso permitido
      expect(
        rolesGuard.canActivate(
          createMockContext({ id: 'u2', email: 'admin@appframe.io', role: UserRole.ADMIN })
        )
      ).toBe(true);

      // SUPER_ADMIN tem acesso permitido
      expect(
        rolesGuard.canActivate(
          createMockContext({ id: 'u3', email: 'super@appframe.io', role: UserRole.SUPER_ADMIN })
        )
      ).toBe(true);
    });
  });

  describe('7.2 Proteção Imutável do Super-Administrador Fundador (christian.zimpel@gmail.com)', () => {
    let adminUsersService: AdminUsersService;
    let mockUserRepo: any;
    let mockSessionRepo: any;
    let mockJobRepo: any;

    beforeEach(async () => {
      mockUserRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn((u) => Promise.resolve(u)),
      };
      mockSessionRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn((s) => Promise.resolve(s)),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        count: jest.fn(),
      };
      mockJobRepo = {
        count: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AdminUsersService,
          { provide: getRepositoryToken(User), useValue: mockUserRepo },
          { provide: getRepositoryToken(UserSession), useValue: mockSessionRepo },
          { provide: getRepositoryToken(VideoJob), useValue: mockJobRepo },
        ],
      }).compile();

      adminUsersService = module.get<AdminUsersService>(AdminUsersService);
    });

    const superAdminActor = {
      userId: 'super-admin-id',
      email: 'christian.zimpel@gmail.com',
      role: UserRole.SUPER_ADMIN,
      sessionId: 'sess-super',
    };

    it('deve impedir que christian.zimpel@gmail.com seja rebaixado para outro papel', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 'super-admin-id',
        email: 'christian.zimpel@gmail.com',
        role: UserRole.SUPER_ADMIN,
        is_active: true,
      });

      await expect(
        adminUsersService.updateUserRole(superAdminActor, 'super-admin-id', UserRole.USER)
      ).rejects.toThrow(ForbiddenException);

      await expect(
        adminUsersService.updateUserRole(superAdminActor, 'super-admin-id', UserRole.USER)
      ).rejects.toThrow('O perfil do Super Admin da plataforma não pode ser alterado.');
    });

    it('deve impedir que christian.zimpel@gmail.com seja bloqueado ou desativado', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 'super-admin-id',
        email: 'christian.zimpel@gmail.com',
        role: UserRole.SUPER_ADMIN,
        is_active: true,
      });

      await expect(
        adminUsersService.updateUserStatus(superAdminActor, 'super-admin-id', false)
      ).rejects.toThrow(ForbiddenException);

      await expect(
        adminUsersService.updateUserStatus(superAdminActor, 'super-admin-id', false)
      ).rejects.toThrow('O Super Admin não pode ser desativado.');
    });

    it('deve permitir alterar papel e status de usuários comuns com sucesso', async () => {
      const normalUser = {
        id: 'user-id-123',
        email: 'outro@empresa.com',
        role: UserRole.USER,
        is_active: true,
      };
      mockUserRepo.findOne.mockResolvedValue(normalUser);

      const roleResult = await adminUsersService.updateUserRole(superAdminActor, 'user-id-123', UserRole.ADMIN);
      expect(roleResult.role).toBe(UserRole.ADMIN);
      expect(mockUserRepo.save).toHaveBeenCalled();

      const statusResult = await adminUsersService.updateUserStatus(superAdminActor, 'user-id-123', false);
      expect(statusResult.success).toBe(true);
    });

    it('deve revogar sessão de usuário imediatamente', async () => {
      const activeSession = {
        id: 'sess-abc',
        user_id: 'user-id-123',
        is_revoked: false,
        user: { email: 'outro@empresa.com', role: UserRole.USER },
      };
      mockSessionRepo.findOne.mockResolvedValue(activeSession);

      const revokeResult = await adminUsersService.revokeSession(superAdminActor, 'sess-abc');
      expect(revokeResult.success).toBe(true);
      expect(activeSession.is_revoked).toBe(true);
      expect(mockSessionRepo.save).toHaveBeenCalledWith(activeSession);
    });
  });

  describe('7.3 GeminiService e Mensagem Amigável de Cota Gratuita Esgotada', () => {
    let geminiService: GeminiService;
    let mockSettingRepo: any;
    let mockUserRepo: any;
    let mockEncryptionService: any;
    let mockConfigService: any;

    beforeEach(async () => {
      mockSettingRepo = {
        findOne: jest.fn(),
        save: jest.fn(),
      };
      mockUserRepo = {
        findOne: jest.fn(),
      };
      mockEncryptionService = {
        encrypt: jest.fn((k) => `encrypted_${k}`),
        decrypt: jest.fn((k) => k?.replace('encrypted_', '')),
      };
      mockConfigService = {
        get: jest.fn((k, def) => def),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GeminiService,
          { provide: getRepositoryToken(User), useValue: mockUserRepo },
          { provide: getRepositoryToken(SystemSetting), useValue: mockSettingRepo },
          { provide: EncryptionService, useValue: mockEncryptionService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      geminiService = module.get<GeminiService>(GeminiService);
    });

    it('deve retornar mensagem amigável quando a cota gratuita do Gemini é esgotada (429 / RESOURCE_EXHAUSTED)', async () => {
      const mockAiClient: any = {
        models: {
          generateContent: jest.fn().mockRejectedValue({
            status: 429,
            message: 'Resource has been exhausted (e.g. check quota).',
          }),
        },
      };

      try {
        await geminiService.generateContentWithFallback(mockAiClient, {
          contents: 'Teste de transcrição',
        });
        fail('Deveria ter lançado BadRequestException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.message).toBe(
          'A cota gratuita do assistente de inteligência artificial (Gemini) foi atingida temporariamente. Por favor, aguarde alguns instantes ou contate o administrador da plataforma.'
        );
      }
    });

    it('deve retornar connected: true no getStatus quando há chave global configurada em SystemSetting', async () => {
      mockSettingRepo.findOne.mockResolvedValue({
        key: 'GEMINI_API_KEY',
        value: 'encrypted_AIzaSyFakeGlobalKey12345',
      });

      const status = await geminiService.getStatus();
      expect(status.connected).toBe(true);
    });

    it('deve retornar connected: false quando não há chave global nem do usuário', async () => {
      mockSettingRepo.findOne.mockResolvedValue(null);
      mockUserRepo.findOne.mockResolvedValue(null);

      const status = await geminiService.getStatus();
      expect(status.connected).toBe(false);
    });
  });
});
