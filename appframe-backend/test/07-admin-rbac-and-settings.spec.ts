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
import { getWelcomeEmailHtml } from '../src/shared/mail/templates/welcome-email.template';
import { getResetPasswordEmailHtml } from '../src/shared/mail/templates/reset-password-email.template';
import {
  getPasswordChangedEmailHtml,
  getTwoFactorEnabledEmailHtml,
  getTwoFactorDisabledEmailHtml,
  getGoogleLinkedEmailHtml,
  getGoogleUnlinkedEmailHtml,
  getAccountDeletedEmailHtml,
  getSessionsRevokedEmailHtml,
} from '../src/shared/mail/templates/security-emails.template';
import { SecurityAuditService } from '../src/core/security/security-audit.service';
import { RedisService } from '../src/core/redis/redis.service';
import { SecurityAuditEvent } from '../src/core/security/entities/security-audit-log.entity';



describe('7. Admin RBAC, Gestão de Usuários, Configurações Globais e Tratamento de Cota Gemini', () => {
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    const mockConfigService = {
      get: jest.fn((key: string) =>
        key === 'SUPER_ADMIN_EMAIL' ? 'christian.zimpel@gmail.com' : undefined,
      ),
    } as unknown as ConfigService;
    rolesGuard = new RolesGuard(reflector, mockConfigService);
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
    let mockAuditService: any;

    beforeEach(async () => {
      mockAuditService = { logEvent: jest.fn().mockResolvedValue({}), findLogs: jest.fn() };
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
          { provide: SecurityAuditService, useValue: mockAuditService },
          {
            provide: ConfigService,
            useValue: {
              get: (k: string, def?: any) =>
                k === 'SUPER_ADMIN_EMAIL' ? 'christian.zimpel@gmail.com' : def,
            },
          },
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

    it('deve registrar eventos de auditoria ao bloquear e desbloquear um usuário', async () => {
      const normalUser = {
        id: 'user-id-456',
        name: 'Usuário Alvo',
        email: 'alvo@empresa.com',
        role: UserRole.USER,
        is_active: true,
      };
      mockUserRepo.findOne.mockResolvedValue(normalUser);

      // Bloquear usuário
      await adminUsersService.updateUserStatus(superAdminActor, 'user-id-456', false, {
        ipAddress: '192.168.1.10',
        userAgent: 'Admin-Browser',
      });
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id-456',
          action: SecurityAuditEvent.USER_BLOCKED,
          metadata: expect.objectContaining({
            performedBy: superAdminActor.email,
            status: 'blocked',
          }),
        }),
      );

      // Desbloquear usuário
      await adminUsersService.updateUserStatus(superAdminActor, 'user-id-456', true, {
        ipAddress: '192.168.1.10',
        userAgent: 'Admin-Browser',
      });
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id-456',
          action: SecurityAuditEvent.USER_UNBLOCKED,
          metadata: expect.objectContaining({
            performedBy: superAdminActor.email,
            status: 'unblocked',
          }),
        }),
      );
    });

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
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id-123',
          action: SecurityAuditEvent.USER_ROLE_CHANGED,
          metadata: expect.objectContaining({
            previousRole: UserRole.USER,
            newRole: UserRole.ADMIN,
          }),
        }),
      );

      const statusResult = await adminUsersService.updateUserStatus(superAdminActor, 'user-id-123', false);
      expect(statusResult.success).toBe(true);
    });

    it('deve impedir que administradores comuns alterem papéis de usuários, restringindo a função ao super-admin', async () => {
      const adminActor = {
        userId: 'admin-actor-id',
        email: 'admin@empresa.com',
        role: UserRole.ADMIN,
        sessionId: 'sess-admin',
      };

      const normalUser = {
        id: 'user-id-789',
        name: 'Usuário Normal',
        email: 'outro789@empresa.com',
        role: UserRole.USER,
        is_active: true,
      };
      mockUserRepo.findOne.mockResolvedValue(normalUser);

      // Administrador comum tentando alterar papel de usuário -> Rejeitado
      await expect(
        adminUsersService.updateUserRole(adminActor, 'user-id-789', UserRole.ADMIN)
      ).rejects.toThrow(ForbiddenException);

      await expect(
        adminUsersService.updateUserRole(adminActor, 'user-id-789', UserRole.ADMIN)
      ).rejects.toThrow('Apenas o Super Admin pode alterar permissões e níveis de acesso de usuários.');

      // Super Admin tenta alterar seu próprio papel -> Rejeitado
      const otherSuperAdminActor = {
        userId: 'super-actor-id',
        email: 'super2@empresa.com',
        role: UserRole.SUPER_ADMIN,
        sessionId: 'sess-super2',
      };
      mockUserRepo.findOne.mockResolvedValue({
        id: 'super-actor-id',
        email: 'super2@empresa.com',
        role: UserRole.ADMIN,
        is_active: true,
      });
      await expect(
        adminUsersService.updateUserRole(otherSuperAdminActor, 'super-actor-id', UserRole.USER)
      ).rejects.toThrow('Você não pode alterar seu próprio perfil de acesso.');

      // Super Admin tenta promover alguém a Super Admin -> Rejeitado
      mockUserRepo.findOne.mockResolvedValue(normalUser);
      await expect(
        adminUsersService.updateUserRole(superAdminActor, 'user-id-789', UserRole.SUPER_ADMIN)
      ).rejects.toThrow('Apenas christian.zimpel@gmail.com pode deter o perfil Super Admin.');
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
      const mockMail = {
        sendWelcomeEmail: jest.fn().mockResolvedValue(true),
        sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
        sendPasswordChangedEmail: jest.fn().mockResolvedValue(true),
        sendTwoFactorEnabledEmail: jest.fn().mockResolvedValue(true),
        sendTwoFactorDisabledEmail: jest.fn().mockResolvedValue(true),
        sendGoogleLinkedEmail: jest.fn().mockResolvedValue(true),
        sendGoogleUnlinkedEmail: jest.fn().mockResolvedValue(true),
        sendAccountDeletedEmail: jest.fn().mockResolvedValue(true),
        sendSessionsRevokedEmail: jest.fn().mockResolvedValue(true),
      };
      const mockRedis = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
      };
      const mockAudit = {
        logEvent: jest.fn().mockResolvedValue({}),
        findLogs: jest.fn().mockResolvedValue([]),
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
        mockMail as any,
        mockRedis as any,
        mockAudit as any,
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

    it('signGoogleLoginState e verifyGoogleLoginState devem gerar e extrair preferência de rememberMe', () => {
      expect(authService.signGoogleLoginState(true)).toBe('signed_token_123');
      expect(authService.verifyGoogleLoginState(JSON.stringify({ purpose: 'google_login', rememberMe: false }))).toBe(false);
      expect(authService.verifyGoogleLoginState(JSON.stringify({ purpose: 'google_login', rememberMe: true }))).toBe(true);
      expect(authService.verifyGoogleLoginState('')).toBeNull();
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

  describe('7.5 E-mail Oficial de Boas-Vindas e Template Responsivo', () => {
    it('getWelcomeEmailHtml deve gerar o template fiel com todas as seções e botão na cor do sistema', () => {
      const html = getWelcomeEmailHtml({
        name: 'Maria Silva',
        appUrl: 'https://appframe.io',
      });

      // 1. Cabeçalho e Identidade Visual
      expect(html).toContain('AppFrame');
      expect(html).toContain('appframe-amber-grad');

      // 2. Card Escuro com Glow Âmbar e Textos Oficiais
      expect(html).toContain('Bem-vindo ao');
      expect(html).toContain('A maneira inteligente');
      expect(html).toContain('de criar e editar seus vídeos');

      // 3. Três Tópicos de Recursos da Imagem de Referência
      expect(html).toContain('Importação fácil');
      expect(html).toContain('YouTube, Instagram e TikTok');
      expect(html).toContain('Crie vídeos');
      expect(html).toContain('dinâmicos e rápidos');

      expect(html).toContain('Legendas automáticas');
      expect(html).toContain('geradas por IA ou legenda fixa');

      // 4. Seção Inferior e Botão na Cor Primária Oficial (#D4A346)
      expect(html).toContain('Sua conta está pronta');
      expect(html).toContain('Acessar Plataforma');
      expect(html).toContain('background-color: #D4A346');
      expect(html).toContain('https://appframe.io/login');
    });
  });

  describe('7.6 Fluxo de Redefinição de Senha (1h de expiração) e Trilha de Auditoria de Segurança', () => {
    let authService: AuthService;
    let mockUserRepo: any;
    let mockSessionRepo: any;
    let mockRedis: any;
    let mockAudit: any;
    let mockMail: any;

    beforeEach(() => {
      mockUserRepo = {
        findOne: jest.fn(),
        save: jest.fn((u) => Promise.resolve(u)),
      };
      mockSessionRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn((s) => Promise.resolve(s)),
        update: jest.fn().mockResolvedValue({ affected: 2 }),
      };
      mockMail = {
        sendWelcomeEmail: jest.fn().mockResolvedValue(true),
        sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
        sendPasswordChangedEmail: jest.fn().mockResolvedValue(true),
        sendTwoFactorEnabledEmail: jest.fn().mockResolvedValue(true),
        sendTwoFactorDisabledEmail: jest.fn().mockResolvedValue(true),
        sendGoogleLinkedEmail: jest.fn().mockResolvedValue(true),
        sendGoogleUnlinkedEmail: jest.fn().mockResolvedValue(true),
        sendAccountDeletedEmail: jest.fn().mockResolvedValue(true),
        sendSessionsRevokedEmail: jest.fn().mockResolvedValue(true),
      };
      mockRedis = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
      };
      mockAudit = {
        logEvent: jest.fn().mockResolvedValue({}),
        findLogs: jest.fn().mockResolvedValue([]),
      };

      const mockJwt = {
        sign: jest.fn(() => 'jwt-test-token'),
        verify: jest.fn(),
      };
      const mockConfig = {
        get: jest.fn((k: string, def?: any) => def),
      };
      const mockTwoFactor = {
        verifyToken: jest.fn().mockReturnValue(true),
      };
      const mockEncryption = {
        decrypt: jest.fn((t) => t),
        encrypt: jest.fn((t) => t),
      };

      authService = new AuthService(
        mockUserRepo as any,
        mockSessionRepo as any,
        {} as any,
        {} as any,
        mockJwt as any,
        mockConfig as any,
        mockTwoFactor as any,
        mockEncryption as any,
        {} as any,
        mockMail as any,
        mockRedis as any,
        mockAudit as any,
      );
    });

    it('deve renderizar o template de e-mail de redefinição de senha com layout e frases similares à referência', () => {
      const html = getResetPasswordEmailHtml({
        name: 'Christian',
        appUrl: 'https://appframe.io',
        resetToken: 'secure-token-123456789',
      });

      // 1. Identidade Visual e Header
      expect(html).toContain('AppFrame');
      expect(html).toContain('appframe-amber-grad-reset');

      // 2. Saudação com Nome
      expect(html).toContain('Olá, Christian!');

      // 3. Frase de solicitação (adaptada em português)
      expect(html).toContain('Alguém solicitou a redefinição de senha da sua conta no AppFrame.');

      // 4. Botão com link seguro e cor do sistema
      expect(html).toContain('Redefinir Minha Senha');
      expect(html).toContain('https://appframe.io/reset-password?token=secure-token-123456789');
      expect(html).toContain('#D99E41');
      expect(html).toContain('btn-reset');

      // 5. Link copiável
      expect(html).toContain('Link para copiar e colar:');

      // 6. Nota de Expiração Estrita de 1 Hora e uso único (itálico)
      expect(html).toContain('Este link é válido por 1 hora e só pode ser utilizado uma única vez.');

      // 7. Parágrafo de segurança
      expect(html).toContain('Se você não solicitou esta alteração, pode ignorar este e-mail com segurança');
      expect(html).toContain('Sua senha não será alterada até que você crie uma nova senha.');
    });

    it('deve renderizar os 7 templates de e-mail de segurança com layout, cabeçalho e rodapé padronizados', () => {
      // 1. Senha Alterada
      const pwdChangedHtml = getPasswordChangedEmailHtml({
        name: 'Christian Zimpel',
        appUrl: 'http://localhost:5173',
        deviceName: 'Chrome em macOS',
        ipAddress: '192.168.1.100',
      });
      expect(pwdChangedHtml).toContain('AppFrame');
      expect(pwdChangedHtml).toContain('Olá, Christian Zimpel!');
      expect(pwdChangedHtml).toContain('A senha da sua conta no AppFrame foi alterada recentemente.');
      expect(pwdChangedHtml).toContain('Senha Atualizada');
      expect(pwdChangedHtml).toContain('Chrome em macOS');
      expect(pwdChangedHtml).toContain('192.168.1.100');
      expect(pwdChangedHtml).toContain('Acessar Minha Conta');

      // 2. 2FA Ativado
      const twoFaEnabledHtml = getTwoFactorEnabledEmailHtml({
        name: 'Christian Zimpel',
        appUrl: 'http://localhost:5173',
        deviceName: 'MacBook Pro',
      });
      expect(twoFaEnabledHtml).toContain('Olá, Christian Zimpel!');
      expect(twoFaEnabledHtml).toContain('A autenticação em duas etapas (2FA) foi ativada com sucesso');
      expect(twoFaEnabledHtml).toContain('Proteção 2FA Ativada');
      expect(twoFaEnabledHtml).toContain('Aplicativo Autenticador (TOTP)');
      expect(twoFaEnabledHtml).toContain('Ver Configurações de Segurança');

      // 3. 2FA Desativado
      const twoFaDisabledHtml = getTwoFactorDisabledEmailHtml({
        name: 'Christian Zimpel',
        appUrl: 'http://localhost:5173',
      });
      expect(twoFaDisabledHtml).toContain('Olá, Christian Zimpel!');
      expect(twoFaDisabledHtml).toContain('A autenticação em duas etapas (2FA) foi desativada');
      expect(twoFaDisabledHtml).toContain('Aviso de Segurança: 2FA Desativado');
      expect(twoFaDisabledHtml).toContain('Reativar 2FA Agora');

      // 4. Google Vinculado
      const googleLinkedHtml = getGoogleLinkedEmailHtml({
        name: 'Christian Zimpel',
        googleEmail: 'christian.zimpel@gmail.com',
      });
      expect(googleLinkedHtml).toContain('Olá, Christian Zimpel!');
      expect(googleLinkedHtml).toContain('Sua conta do Google foi vinculada');
      expect(googleLinkedHtml).toContain('Google Conectado');
      expect(googleLinkedHtml).toContain('christian.zimpel@gmail.com');

      // 5. Google Desvinculado
      const googleUnlinkedHtml = getGoogleUnlinkedEmailHtml({
        name: 'Christian Zimpel',
      });
      expect(googleUnlinkedHtml).toContain('Olá, Christian Zimpel!');
      expect(googleUnlinkedHtml).toContain('A sua conta Google foi desvinculada');
      expect(googleUnlinkedHtml).toContain('Google Desvinculado');

      // 6. Conta Excluída
      const accountDeletedHtml = getAccountDeletedEmailHtml({
        name: 'Christian Zimpel',
      });
      expect(accountDeletedHtml).toContain('Olá, Christian Zimpel!');
      expect(accountDeletedHtml).toContain('Confirmamos que a sua conta no AppFrame foi excluída permanentemente');
      expect(accountDeletedHtml).toContain('Conta Encerrada');
      expect(accountDeletedHtml).toContain('LGPD');

      // 7. Desconectar Outros Dispositivos
      const sessionsRevokedHtml = getSessionsRevokedEmailHtml({
        name: 'Christian Zimpel',
        revokedCount: 3,
        deviceName: 'Safari no iPad',
      });
      expect(sessionsRevokedHtml).toContain('Olá, Christian Zimpel!');
      expect(sessionsRevokedHtml).toContain('Todos os outros dispositivos conectados à sua conta AppFrame foram desconectados');
      expect(sessionsRevokedHtml).toContain('Sessões Revogadas');
      expect(sessionsRevokedHtml).toContain('3 outro(s) dispositivo(s)');
      expect(sessionsRevokedHtml).toContain('Ver Sessões Ativas');
    });

    it('deve gerar token no Redis com expiração estrita de 1 hora (3600 segundos) e registrar evento no log de auditoria', async () => {
      const user = {
        id: 'user-reset-1',
        name: 'Christian Zimpel',
        email: 'christian.zimpel@gmail.com',
      };
      mockUserRepo.findOne.mockResolvedValue(user);

      const result = await authService.requestPasswordReset('christian.zimpel@gmail.com', {
        ip: '200.100.50.25',
        userAgent: 'Mozilla/5.0 Mac OS X',
      });

      expect(result.success).toBe(true);

      // Valida gravação no Redis com TTL de 3600s (1 hora)
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^pwd_reset:/),
        expect.stringContaining('user-reset-1'),
        'EX',
        3600,
      );
      expect(mockRedis.set).toHaveBeenCalledWith(
        'user_pwd_reset:user-reset-1',
        expect.any(String),
        'EX',
        3600,
      );

      // Valida disparo do e-mail oficial
      expect(mockMail.sendPasswordResetEmail).toHaveBeenCalledWith(
        'christian.zimpel@gmail.com',
        expect.any(String),
        'Christian Zimpel',
      );

      // Valida registro de auditoria persistente
      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-reset-1',
          action: SecurityAuditEvent.PASSWORD_RESET_REQUESTED,
          ipAddress: '200.100.50.25',
          userAgent: 'Mozilla/5.0 Mac OS X',
        }),
      );
    });

    it('deve redefinir a senha com sucesso, invalidar o token no Redis, desconectar todas as sessões e registrar logs', async () => {
      const user = {
        id: 'user-reset-1',
        email: 'christian.zimpel@gmail.com',
        password_hash: 'old_hash',
      };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockRedis.get.mockResolvedValue(
        JSON.stringify({ userId: 'user-reset-1', email: 'christian.zimpel@gmail.com' }),
      );

      const result = await authService.resetPassword(
        { token: 'valid-token-abc', newPassword: 'NovaSenhaUltraSegura123!' },
        { ip: '177.10.20.30', userAgent: 'Chrome/120' },
      );

      expect(result.success).toBe(true);
      expect(user.password_hash).not.toBe('old_hash');
      expect(mockUserRepo.save).toHaveBeenCalledWith(user);

      // Invalidação imediata do token no Redis (não permite reuso)
      expect(mockRedis.del).toHaveBeenCalledWith(expect.stringMatching(/^pwd_reset:/));
      expect(mockRedis.del).toHaveBeenCalledWith('user_pwd_reset:user-reset-1');

      // Revogação de todas as sessões ativas do usuário
      expect(mockSessionRepo.update).toHaveBeenCalledWith(
        { user_id: 'user-reset-1', is_revoked: false },
        { is_revoked: true },
      );

      // Logs de auditoria: PASSWORD_RESET_COMPLETED e ALL_SESSIONS_REVOKED
      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-reset-1',
          action: SecurityAuditEvent.PASSWORD_RESET_COMPLETED,
        }),
      );
      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-reset-1',
          action: SecurityAuditEvent.ALL_SESSIONS_REVOKED,
        }),
      );
    });

    it('deve falhar a redefinição se o token for inválido ou tiver expirado após 1 hora', async () => {
      mockRedis.get.mockResolvedValue(null); // Expirado ou inexistente no Redis

      await expect(
        authService.resetPassword({
          token: 'expired-or-invalid-token',
          newPassword: 'NovaSenha123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve revogar qualquer token de redefinição no Redis e registrar logs quando o usuário alterar a senha autenticado', async () => {
      const user = {
        id: 'user-1',
        email: 'christian@appframe.io',
        password_hash: null, // Sem senha anterior para simplificar validação
      };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockRedis.get.mockResolvedValue('pending-token-hash-123'); // Havia um token de redefinição pendente

      await authService.changePassword(
        'user-1',
        'current-session-id',
        { newPassword: 'NovissimaSenha123' },
        { ip: '10.0.0.1', userAgent: 'Firefox' },
      );

      // O token pendente no Redis deve ter sido revogado imediatamente
      expect(mockRedis.del).toHaveBeenCalledWith('pwd_reset:pending-token-hash-123');
      expect(mockRedis.del).toHaveBeenCalledWith('user_pwd_reset:user-1');

      // Logs de auditoria
      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: SecurityAuditEvent.PASSWORD_CHANGED,
        }),
      );
      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: SecurityAuditEvent.ALL_SESSIONS_REVOKED,
        }),
      );
    });

    it('deve registrar eventos de auditoria ao alterar perfil, 2FA, sessões e conta Google', async () => {
      const user = {
        id: 'user-audit-1',
        name: 'Nome Antigo',
        email: 'antigo@appframe.io',
        totp_secret: 'secret-123',
        is_two_factor_enabled: true,
        password_hash: 'hash-123',
        google_id: 'google-123',
        google_email: 'antigo@appframe.io',
      };
      mockUserRepo.findOne.mockResolvedValue(user);

      const meta = { ip: '127.0.0.1', userAgent: 'Jest-Runner' };

      // 1. Alteração de Nome
      await authService.updateProfile('user-audit-1', { name: 'Nome Atualizado' }, meta);
      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-audit-1',
          action: SecurityAuditEvent.PROFILE_NAME_CHANGED,
        }),
      );

      // 2. Desativação do 2FA
      await authService.disable2fa('user-audit-1', '123456', meta);
      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-audit-1',
          action: SecurityAuditEvent.TWO_FACTOR_DISABLED,
        }),
      );

      // 3. Desconexão de uma sessão específica
      mockSessionRepo.findOne.mockResolvedValue({ id: 'sess-target', user_id: 'user-audit-1', device_name: 'Chrome' });
      await authService.revokeSession('user-audit-1', 'sess-target', meta);
      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-audit-1',
          action: SecurityAuditEvent.SESSION_REVOKED,
        }),
      );

      // 4. Desconexão de todas as outras sessões
      await authService.revokeOtherSessions('user-audit-1', 'current-sess', meta);
      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-audit-1',
          action: SecurityAuditEvent.ALL_SESSIONS_REVOKED,
        }),
      );

      // 5. Desvinculação de conta Google
      await authService.unlinkGoogle('user-audit-1', meta);
      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-audit-1',
          action: SecurityAuditEvent.GOOGLE_ACCOUNT_UNLINKED,
        }),
      );
    });

    it('deve rejeitar cadastro (register) se a senha não atingir o critério de segurança forte', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      // Menor que 8 caracteres
      await expect(
        authService.register({
          name: 'Tester',
          email: 'weak1@appframe.io',
          password: 'Aa1!', // 4 caracteres
        }),
      ).rejects.toThrow(BadRequestException);

      // 8 caracteres sem diversidade (apenas números)
      await expect(
        authService.register({
          name: 'Tester',
          email: 'weak2@appframe.io',
          password: '12345678',
        }),
      ).rejects.toThrow(BadRequestException);

      // 8 caracteres sem diversidade (apenas minúsculas)
      await expect(
        authService.register({
          name: 'Tester',
          email: 'weak3@appframe.io',
          password: 'abcdefgh',
        }),
      ).rejects.toThrow(BadRequestException);

      // Senha forte válida (score >= 3 e >= 8 caracteres)
      expect(authService.isPasswordStrong('SenhaSegura123!')).toBe(true);
      expect(authService.isPasswordStrong('Password$2026!')).toBe(true);
      expect(authService.isPasswordStrong('Aa1!Aa1!')).toBe(true);
      expect(authService.isPasswordStrong('curta1!')).toBe(false);
      expect(authService.isPasswordStrong('somenteletras')).toBe(false);
    });

    it('deve obter e renderizar os termos de serviço e política de privacidade com interpolação dinâmica e auditoria', async () => {
      const mockSettingRepo: any = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((val) => val),
        save: jest.fn(async (val) => val),
        delete: jest.fn(),
      };
      const mockEncryptionService: any = {
        encrypt: jest.fn((v) => v),
        decrypt: jest.fn((v) => v),
      };
      const mockDownloadService: any = {
        getCookiesStatus: jest.fn().mockReturnValue({ configured: false }),
      };
      const mockConfigService: any = {
        get: jest.fn().mockReturnValue('https://appframe.io'),
      };
      const mockAuditService: any = {
        logEvent: jest.fn().mockResolvedValue({}),
      };

      const settingsService = new AdminSettingsService(
        mockSettingRepo,
        mockEncryptionService,
        mockDownloadService,
        mockConfigService,
        mockAuditService,
      );

      const docs = await settingsService.getLegalDocuments();
      expect(docs.terms.rendered).toContain('Termos de Serviço — AppFrame');
      expect(docs.terms.rendered).toContain('AppFrame Tecnologia & Vídeo Digital');
      expect(docs.terms.rendered).toContain('contato@appframe.com.br');
      expect(docs.privacy.rendered).toContain('Política de Privacidade — AppFrame');
      expect(docs.privacy.rendered).toContain('privacidade@appframe.com.br');
      expect(docs.terms.rendered).not.toContain('{{company_name}}');
      expect(docs.privacy.rendered).not.toContain('{{dpo_email}}');

      // Teste de salvar customizado
      await settingsService.saveLegalDocuments(
        {
          companyName: 'Minha Empresa Tech',
          contactEmail: 'suporte@empresa.com',
          termsOfService: '# Termos Customizados\nEmpresa: {{company_name}}',
        },
        {
          userId: 'admin-id',
          ipAddress: '127.0.0.1',
        },
      );

      expect(mockSettingRepo.save).toHaveBeenCalled();
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: SecurityAuditEvent.LEGAL_DOCUMENTS_UPDATED,
        }),
      );

      // Teste de restauração para padrão
      await settingsService.resetLegalDocumentsToDefault({ userId: 'admin-id' });
      expect(mockSettingRepo.delete).toHaveBeenCalledWith({ key: 'LEGAL_TERMS_OF_SERVICE' });
      expect(mockSettingRepo.delete).toHaveBeenCalledWith({ key: 'LEGAL_PRIVACY_POLICY' });
    });

    it('deve registrar eventos de auditoria ao adicionar ou remover cookies do YouTube e chaves do Gemini', async () => {
      const mockSettingRepo: any = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((val) => val),
        save: jest.fn(async (val) => val),
        delete: jest.fn(),
      };
      const mockEncryptionService: any = {
        encrypt: jest.fn((v) => v),
        decrypt: jest.fn((v) => v),
      };
      const mockDownloadService: any = {
        getCookiesStatus: jest.fn().mockReturnValue({ configured: true, sizeBytes: 256 }),
        saveCookies: jest.fn().mockReturnValue({ success: true, message: 'Cookies salvos' }),
        deleteCookies: jest.fn().mockReturnValue({ success: true, message: 'Cookies removidos' }),
      };
      const mockConfigService: any = {
        get: jest.fn().mockReturnValue('https://appframe.io'),
      };
      const mockAuditService: any = {
        logEvent: jest.fn().mockResolvedValue({}),
      };

      const settingsService = new AdminSettingsService(
        mockSettingRepo,
        mockEncryptionService,
        mockDownloadService,
        mockConfigService,
        mockAuditService,
      );

      const auditCtx = {
        userId: 'admin-super-1',
        userEmail: 'christian.zimpel@gmail.com',
        ipAddress: '192.168.1.50',
        userAgent: 'Jest-Test-Agent',
      };

      // 1. YouTube Cookies Salvos
      await settingsService.saveYouTubeCookies('dummy_cookie_content', auditCtx);
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-super-1',
          action: SecurityAuditEvent.YOUTUBE_COOKIES_SAVED,
          metadata: expect.objectContaining({
            performedBy: 'christian.zimpel@gmail.com',
          }),
        }),
      );

      // 2. YouTube Cookies Removidos
      await settingsService.deleteYouTubeCookies(auditCtx);
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-super-1',
          action: SecurityAuditEvent.YOUTUBE_COOKIES_DELETED,
          metadata: expect.objectContaining({
            performedBy: 'christian.zimpel@gmail.com',
          }),
        }),
      );

      // 3. Gemini API Key Removida
      await settingsService.deleteGeminiApiKey(auditCtx);
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-super-1',
          action: SecurityAuditEvent.GEMINI_KEY_DELETED,
          metadata: expect.objectContaining({
            performedBy: 'christian.zimpel@gmail.com',
          }),
        }),
      );
    });
  });
});



