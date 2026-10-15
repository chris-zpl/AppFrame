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
import { AuthService } from '../src/modules/auth/auth.service';
import { UserResponseDto } from '../src/modules/users/dto/response/user-response.dto';


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

  describe('7.4 Regra de Alteração de E-mail (6 meses) e Google OAuth Email', () => {
    let authService: AuthService;
    let mockUserRepo: any;

    beforeEach(() => {
      mockUserRepo = {
        findOne: jest.fn(),
        save: jest.fn((u) => Promise.resolve(u)),
      };
      const mockJwt = {
        sign: jest.fn(() => 'signed_token_123'),
        verify: jest.fn((token: string) => {
          if (token === 'valid_link_token') {
            return { purpose: 'google_link', userId: 'user-joao' };
          }
          throw new Error('Invalid token');
        }),
      };
      const mockConfig = {
        get: jest.fn((k: string, def?: any) => {
          if (k === 'GOOGLE_CLIENT_ID') return 'google-client-id-123';
          if (k === 'GOOGLE_CALLBACK_URL') return 'http://localhost:3000/api/v1/auth/google/callback';
          return def;
        }),
      };
      authService = new AuthService(
        mockUserRepo as any,
        {} as any,
        {} as any,
        {} as any,
        mockJwt as any,
        mockConfig as any,
        {} as any,
        {} as any,
        {} as any,
      );
    });


    it('deve bloquear a alteração de e-mail se foi alterado há menos de 6 meses', async () => {
      const lastChanged = new Date();
      lastChanged.setMonth(lastChanged.getMonth() - 2); // 2 meses atrás

      const user = {
        id: 'user-1',
        name: 'Christian',
        email: 'antigo@appframe.io',
        email_changed_at: lastChanged,
      };
      mockUserRepo.findOne.mockResolvedValue(user);

      await expect(
        authService.updateProfile('user-1', { email: 'novo@appframe.io' })
      ).rejects.toThrow(BadRequestException);
    });

    it('deve permitir a alteração de e-mail se a última alteração foi há mais de 6 meses e atualizar email_changed_at', async () => {
      const lastChanged = new Date();
      lastChanged.setMonth(lastChanged.getMonth() - 7); // 7 meses atrás

      const user: any = {
        id: 'user-1',
        name: 'Christian',
        email: 'antigo@appframe.io',
        email_changed_at: lastChanged,
      };
      // 1º findOne: busca o usuário atual; 2º findOne: checa se novo e-mail já existe
      mockUserRepo.findOne
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(null);

      const updated = await authService.updateProfile('user-1', { email: 'novo@appframe.io' });
      expect(updated.email).toBe('novo@appframe.io');
      expect(mockUserRepo.save).toHaveBeenCalled();
      expect(user.email_changed_at).toBeDefined();
      expect(new Date().getTime() - new Date(user.email_changed_at!).getTime()).toBeLessThan(5000);
    });

    it('deve permitir atualizar apenas o nome sem bloquear pela regra de 6 meses de e-mail', async () => {
      const lastChanged = new Date();
      const user: any = {
        id: 'user-1',
        name: 'Nome Antigo',
        email: 'mesmo@appframe.io',
        email_changed_at: lastChanged,
      };
      mockUserRepo.findOne.mockResolvedValue(user);

      const updated = await authService.updateProfile('user-1', { name: 'Nome Novo' });
      expect(updated.name).toBe('Nome Novo');
      expect(user.email_changed_at).toBe(lastChanged);
    });

    it('UserResponseDto.fromEntity deve expor google_email e email_changed_at', () => {
      const user: any = {
        id: 'u-1',
        name: 'User',
        email: 'sys@appframe.io',
        google_email: 'google@gmail.com',
        google_id: 'g-123',
        email_changed_at: new Date('2026-01-01T00:00:00Z'),
        role: UserRole.USER,
        is_active: true,
      };
      const dto = UserResponseDto.fromEntity(user);
      expect(dto.google_email).toBe('google@gmail.com');
      expect(dto.email_changed_at).toEqual(new Date('2026-01-01T00:00:00Z'));
    });

    it('getGoogleConnectUrl deve gerar URL contendo prompt=select_account e state assinado', () => {
      const result = authService.getGoogleConnectUrl('user-joao');
      expect(result.url).toContain('prompt=select_account');
      expect(result.url).toContain('state=signed_token_123');
      expect(result.url).toContain('client_id=google-client-id-123');
    });

    it('verifyGoogleLinkState deve extrair userId do state válido e null se inválido', () => {
      expect(authService.verifyGoogleLinkState('valid_link_token')).toBe('user-joao');
      expect(authService.verifyGoogleLinkState('invalid_token')).toBeNull();
    });

    it('linkGoogleAccount deve vincular Google ID e Google Email ao perfil do usuário atual', async () => {
      const joaoUser: any = {
        id: 'user-joao',
        name: 'João',
        email: 'joao@empresa.com',
        google_id: null,
        google_email: null,
      };
      // 1º findOne: busca usuário atual; 2º findOne: busca google_id; 3º findOne: busca email Google
      mockUserRepo.findOne
        .mockResolvedValueOnce(joaoUser)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await authService.linkGoogleAccount('user-joao', {
        googleId: 'google-id-joao-999',
        email: 'joao.silva@gmail.com',
        name: 'João Silva',
      });

      expect(result.success).toBe(true);
      expect(joaoUser.google_id).toBe('google-id-joao-999');
      expect(joaoUser.google_email).toBe('joao.silva@gmail.com');
      expect(mockUserRepo.save).toHaveBeenCalledWith(joaoUser);
    });

    it('linkGoogleAccount deve recusar se a conta Google já estiver vinculada a outro usuário', async () => {
      const joaoUser: any = {
        id: 'user-joao',
        email: 'joao@empresa.com',
      };
      const christianUser: any = {
        id: 'user-christian',
        email: 'christian.zimpel@gmail.com',
        google_id: 'google-id-christian-111',
      };

      // 1º findOne: busca usuário atual; 2º findOne: encontra Christian pelo google_id
      mockUserRepo.findOne
        .mockResolvedValueOnce(joaoUser)
        .mockResolvedValueOnce(christianUser);

      const result = await authService.linkGoogleAccount('user-joao', {
        googleId: 'google-id-christian-111',
        email: 'christian.zimpel@gmail.com',
        name: 'Christian Zimpel',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('já está vinculada a outro perfil');
    });

    it('linkGoogleAccount deve recusar se o e-mail do Google já estiver cadastrado em outro usuário', async () => {
      const joaoUser: any = {
        id: 'user-joao',
        email: 'joao@empresa.com',
      };
      const outroUser: any = {
        id: 'user-outro',
        email: 'outro@gmail.com',
      };

      // 1º findOne: busca usuário atual; 2º findOne: google_id livre; 3º findOne: e-mail já existe
      mockUserRepo.findOne
        .mockResolvedValueOnce(joaoUser)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(outroUser);

      const result = await authService.linkGoogleAccount('user-joao', {
        googleId: 'new-google-id',
        email: 'outro@gmail.com',
        name: 'Outro Usuário',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('já está cadastrado em outro perfil');
    });
  });
});


