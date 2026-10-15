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
import { SecurityAuditService } from '../src/core/security/security-audit.service';
import { RedisService } from '../src/core/redis/redis.service';
import { SecurityAuditEvent } from '../src/core/security/entities/security-audit-log.entity';



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
          { provide: SecurityAuditService, useValue: { logEvent: jest.fn(), findLogs: jest.fn() } },
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
      const mockMail = {
        sendWelcomeEmail: jest.fn().mockResolvedValue(true),
        sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
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

    it('deve renderizar o template de e-mail de redefinição de senha com layout idêntico à imagem de referência', () => {
      const html = getResetPasswordEmailHtml({
        name: 'Christian',
        appUrl: 'https://appframe.io',
        resetToken: 'secure-token-123456789',
      });

      // 1. Identidade Visual e Header
      expect(html).toContain('AppFrame');
      expect(html).toContain('appframe-amber-grad-reset');

      // 2. Título Central Oficial
      expect(html).toContain('Redefinir senha');

      // 3. Mensagem Explicativa
      expect(html).toContain('Recebemos uma solicitação para redefinir a sua senha.');

      // 4. Botão com link seguro e cor do sistema
      expect(html).toContain('https://appframe.io/reset-password?token=secure-token-123456789');
      expect(html).toContain('#D99E41');
      expect(html).toContain('btn-reset');

      // 5. Nota de Expiração Estrita de 1 Hora e Segurança
      expect(html).toContain('O link expira em 1 hora. Se você não solicitou, ignore este e-mail.');
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
  });
});



