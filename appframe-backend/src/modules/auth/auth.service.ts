import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { User } from '../users/entities/user.entity';
import { UserSession } from '../users/entities/user-session.entity';
import { AuthProvider } from '../users/enums/auth-provider.enum';
import { Watermark } from '../watermarks/entities/watermark.entity';
import { VideoJob } from '../media/entities/video-job.entity';

import { RegisterDto } from './dto/request/register.dto';
import { LoginDto } from './dto/request/login.dto';
import { RefreshTokenDto } from './dto/request/refresh-token.dto';
import { Enable2faDto } from './dto/request/enable-2fa.dto';
import { Verify2faDto } from './dto/request/verify-2fa.dto';
import { ChangePasswordDto } from './dto/request/change-password.dto';
import { DeleteAccountDto } from './dto/request/delete-account.dto';
import { UpdateProfileDto } from './dto/request/update-profile.dto';

import { AuthResponseDto } from './dto/response/auth-response.dto';
import { Generate2faResponseDto } from './dto/response/generate-2fa-response.dto';
import { ActiveSessionResponseDto } from './dto/response/active-session-response.dto';
import { UserResponseDto } from '../users/dto/response/user-response.dto';

import { TwoFactorService } from './services/two-factor.service';
import { EncryptionService } from '../../core/security/encryption.service';
import { StorageService } from '../../shared/storage/storage.service';
import { DeviceDetectorHelper } from './helpers/device-detector.helper';
import { GoogleProfile } from './strategies/google.strategy';
import { JwtPayload } from './interfaces/jwt-payload.interface';

export interface SessionMeta {
  ip?: string;
  userAgent?: string;
  deviceName?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
    @InjectRepository(Watermark)
    private readonly watermarkRepository: Repository<Watermark>,
    @InjectRepository(VideoJob)
    private readonly videoJobRepository: Repository<VideoJob>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly twoFactorService: TwoFactorService,
    private readonly encryptionService: EncryptionService,
    private readonly storageService: StorageService,
  ) {
    this.jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    this.refreshExpiresIn = this.configService.get<string>(
      'REFRESH_TOKEN_EXPIRES_IN',
      '30d',
    );
  }

  // --- Funções Criptográficas Auxiliares ---

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, stored: string): boolean {
    const [salt, key] = stored.split(':');
    if (!salt || !key) return false;
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(key, 'hex'));
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private signAccessToken(user: User, sessionId: string): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      sessionId,
      purpose: 'access',
    };
    return this.jwtService.sign(payload, { expiresIn: this.jwtExpiresIn as any });
  }

  private signRefreshToken(user: User, sessionId: string, rememberMe: boolean = false): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      sessionId,
      purpose: 'refresh',
      rememberMe,
    };
    const expiresIn = rememberMe ? this.refreshExpiresIn : '1d';
    return this.jwtService.sign(payload, { expiresIn: expiresIn as any });
  }

  private sign2faChallengeToken(user: User, rememberMe: boolean = false): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      purpose: '2fa_challenge',
      rememberMe,
    };
    return this.jwtService.sign(payload, { expiresIn: '5m' });
  }

  // --- Criação de Sessão e Emissão de Tokens ---

  private async createSessionAndTokens(
    user: User,
    meta?: SessionMeta,
    rememberMe: boolean = false,
  ): Promise<AuthResponseDto> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 1));

    const deviceName =
      meta?.deviceName || DeviceDetectorHelper.getFriendlyDeviceName(meta?.userAgent);

    const session = this.sessionRepository.create({
      user_id: user.id,
      refresh_token_hash: 'temp', // Será atualizado logo abaixo com o token assinado
      ip_address: meta?.ip || null,
      user_agent: meta?.userAgent || null,
      device_name: deviceName,
      is_revoked: false,
      last_active_at: new Date(),
      expires_at: expiresAt,
    });

    const savedSession = await this.sessionRepository.save(session);

    const accessToken = this.signAccessToken(user, savedSession.id);
    const refreshToken = this.signRefreshToken(user, savedSession.id, rememberMe);

    // Persiste o hash SHA-256 do refresh token
    savedSession.refresh_token_hash = this.hashToken(refreshToken);
    await this.sessionRepository.save(savedSession);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      remember_me: rememberMe,
      user: UserResponseDto.fromEntity(user)!,
    };
  }

  // --- Autenticação Local ---

  async register(
    dto: RegisterDto,
    meta?: SessionMeta,
  ): Promise<AuthResponseDto> {
    const emailNormalized = dto.email.trim().toLowerCase();
    const existing = await this.userRepository.findOne({
      where: { email: emailNormalized },
    });
    if (existing) {
      throw new ConflictException('Já existe um usuário cadastrado com este e-mail.');
    }

    const user = this.userRepository.create({
      name: dto.name.trim(),
      email: emailNormalized,
      password_hash: this.hashPassword(dto.password),
      auth_provider: AuthProvider.LOCAL,
      is_two_factor_enabled: false,
    });

    const savedUser = await this.userRepository.save(user);
    return {
      user: UserResponseDto.fromEntity(savedUser)!,
    };
  }

  async login(
    dto: LoginDto,
    meta?: SessionMeta,
  ): Promise<AuthResponseDto> {
    const emailNormalized = dto.email.trim().toLowerCase();
    const user = await this.userRepository.findOne({
      where: { email: emailNormalized },
    });

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const isValid = this.verifyPassword(dto.password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const rememberMe = Boolean(dto.rememberMe);

    // Se 2FA estiver ativado, retorna desafio em vez de tokens definitivos
    if (user.is_two_factor_enabled) {
      const tempToken = this.sign2faChallengeToken(user, rememberMe);
      return {
        require_2fa: true,
        temp_token: tempToken,
      };
    }

    return this.createSessionAndTokens(user, meta, rememberMe);
  }

  // --- Rotação de Refresh Token ---

  async refreshTokens(
    dto: RefreshTokenDto,
    meta?: SessionMeta,
  ): Promise<AuthResponseDto> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token expirado ou inválido.');
    }

    if (payload.purpose !== 'refresh' || !payload.sessionId) {
      throw new UnauthorizedException('Token inválido para esta operação.');
    }

    const session = await this.sessionRepository.findOne({
      where: { id: payload.sessionId, is_revoked: false },
    });

    if (!session) {
      throw new UnauthorizedException('Sessão inexistente ou já revogada.');
    }

    if (new Date() > new Date(session.expires_at)) {
      session.is_revoked = true;
      await this.sessionRepository.save(session);
      throw new UnauthorizedException('Sessão expirada.');
    }

    // Detecção de Reuso de Refresh Token
    const incomingTokenHash = this.hashToken(dto.refreshToken);
    if (session.refresh_token_hash !== incomingTokenHash) {
      // Violação de segurança: invalida a sessão imediatamente
      session.is_revoked = true;
      await this.sessionRepository.save(session);
      this.logger.warn(
        `[Segurança] Reuso de refresh token detectado na sessão ${session.id}. Sessão revogada forçadamente.`,
      );
      throw new UnauthorizedException(
        'Violação de integridade do token. Sessão invalidada por segurança.',
      );
    }

    const user = await this.userRepository.findOne({ where: { id: session.user_id } });
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    const rememberMe = Boolean(payload.rememberMe);

    // Rotação estrita: gera novo par de tokens
    const newAccessToken = this.signAccessToken(user, session.id);
    const newRefreshToken = this.signRefreshToken(user, session.id, rememberMe);

    // Atualiza a sessão com o hash do NOVO token
    session.refresh_token_hash = this.hashToken(newRefreshToken);
    session.last_active_at = new Date();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + (rememberMe ? 30 : 1));
    session.expires_at = newExpiresAt;

    if (meta?.ip) session.ip_address = meta.ip;
    if (meta?.userAgent) {
      session.user_agent = meta.userAgent;
      session.device_name = DeviceDetectorHelper.getFriendlyDeviceName(meta.userAgent);
    }

    await this.sessionRepository.save(session);

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      remember_me: rememberMe,
      user: UserResponseDto.fromEntity(user)!,
    };
  }

  // --- Google OAuth 2.0 ---

  async handleGoogleCallback(
    profile: GoogleProfile,
    meta?: SessionMeta,
  ): Promise<AuthResponseDto> {
    const emailNormalized = profile.email.trim().toLowerCase();

    // 1. Procura usuário existente pelo Google ID
    let user = await this.userRepository.findOne({
      where: { google_id: profile.googleId },
    });

    if (!user) {
      // 2. Procura usuário pelo email cadastrado previamente
      user = await this.userRepository.findOne({
        where: { email: emailNormalized },
      });

      if (user) {
        // Vincula o google_id à conta existente
        user.google_id = profile.googleId;
        user.auth_provider = AuthProvider.GOOGLE;
        await this.userRepository.save(user);
      } else {
        // 3. Cria novo usuário originado pelo Google
        user = this.userRepository.create({
          name: profile.name,
          email: emailNormalized,
          google_id: profile.googleId,
          auth_provider: AuthProvider.GOOGLE,
          password_hash: null, // Senha nula para contas Google
          is_two_factor_enabled: false,
        });
        user = await this.userRepository.save(user);
      }
    }

    // Se 2FA estiver ativado na conta, emite desafio
    if (user.is_two_factor_enabled) {
      const tempToken = this.sign2faChallengeToken(user, true);
      return {
        require_2fa: true,
        temp_token: tempToken,
      };
    }

    return this.createSessionAndTokens(user, meta, true);
  }

  // --- Segundo Fator de Autenticação (2FA) ---

  async generate2faSecret(userId: string): Promise<Generate2faResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const { secret, qrCodeDataUrl, recoveryCodes } =
      await this.twoFactorService.generateSecret(user.email);

    // Armazena temporariamente o segredo e códigos criptografados no banco
    user.totp_secret = this.encryptionService.encrypt(secret);
    user.recovery_codes = recoveryCodes.map((code) =>
      this.encryptionService.encrypt(code),
    );
    await this.userRepository.save(user);

    return {
      secret,
      qr_code_data_url: qrCodeDataUrl,
      recovery_codes: recoveryCodes,
    };
  }

  async enable2fa(userId: string, dto: Enable2faDto): Promise<{ success: boolean }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.totp_secret) {
      throw new BadRequestException('Gere a chave 2FA antes de ativá-la.');
    }

    const plaintextSecret = this.encryptionService.decrypt(user.totp_secret);
    const isValid = this.twoFactorService.verifyToken(dto.token, plaintextSecret);

    if (!isValid) {
      throw new BadRequestException('Código TOTP de 6 dígitos inválido.');
    }

    user.is_two_factor_enabled = true;
    await this.userRepository.save(user);

    return { success: true };
  }

  async disable2fa(userId: string, token: string): Promise<{ success: boolean }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.is_two_factor_enabled || !user.totp_secret) {
      throw new BadRequestException('2FA não está ativo nesta conta.');
    }

    const plaintextSecret = this.encryptionService.decrypt(user.totp_secret);
    const isValid = this.twoFactorService.verifyToken(token, plaintextSecret);

    if (!isValid) {
      throw new UnauthorizedException('Código de autenticação inválido.');
    }

    user.is_two_factor_enabled = false;
    user.totp_secret = null;
    user.recovery_codes = null;
    await this.userRepository.save(user);

    return { success: true };
  }

  async verify2faChallenge(
    dto: Verify2faDto,
    meta?: SessionMeta,
  ): Promise<AuthResponseDto> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(dto.tempToken);
    } catch {
      throw new UnauthorizedException('Desafio de 2FA expirado. Efetue login novamente.');
    }

    if (payload.purpose !== '2fa_challenge') {
      throw new UnauthorizedException('Token de desafio inválido.');
    }

    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user || !user.totp_secret) {
      throw new UnauthorizedException('Usuário ou segredo 2FA não encontrado.');
    }

    // 1. Tenta validar como código TOTP de 6 dígitos
    const plaintextSecret = this.encryptionService.decrypt(user.totp_secret);
    let isAuthenticated = this.twoFactorService.verifyToken(dto.token, plaintextSecret);

    // 2. Se não validar TOTP, tenta validar como código de recuperação
    if (!isAuthenticated && user.recovery_codes && user.recovery_codes.length > 0) {
      const decryptedRecoveryCodes = user.recovery_codes.map((c) =>
        this.encryptionService.decrypt(c),
      );

      const recoveryCheck = this.twoFactorService.verifyRecoveryCode(
        dto.token,
        decryptedRecoveryCodes,
      );

      if (recoveryCheck.isValid) {
        isAuthenticated = true;
        // Atualiza a lista de códigos restantes no banco
        user.recovery_codes = recoveryCheck.remainingCodes.map((c) =>
          this.encryptionService.encrypt(c),
        );
        await this.userRepository.save(user);
        this.logger.log(`Usuário ${user.id} utilizou um código de recuperação para login.`);
      }
    }

    if (!isAuthenticated) {
      throw new UnauthorizedException('Código de autenticação ou recuperação inválido.');
    }

    return this.createSessionAndTokens(user, meta, Boolean(payload.rememberMe));
  }

  // --- Gerenciamento de Sessões ---

  async getSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<ActiveSessionResponseDto[]> {
    const sessions = await this.sessionRepository.find({
      where: { user_id: userId, is_revoked: false },
      order: { last_active_at: 'DESC' },
    });
    return ActiveSessionResponseDto.fromEntities(sessions, currentSessionId);
  }

  async revokeSession(userId: string, sessionId: string): Promise<{ revoked: boolean }> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, user_id: userId },
    });
    if (!session) {
      throw new NotFoundException('Sessão não encontrada.');
    }
    session.is_revoked = true;
    await this.sessionRepository.save(session);
    return { revoked: true };
  }

  async revokeOtherSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<{ revokedCount: number }> {
    const result = await this.sessionRepository.update(
      {
        user_id: userId,
        id: Not(currentSessionId),
        is_revoked: false,
      },
      { is_revoked: true },
    );
    return { revokedCount: result.affected || 0 };
  }

  // --- Perfil e Ciclo de Vida ---

  async changePassword(
    userId: string,
    currentSessionId: string,
    dto: ChangePasswordDto,
  ): Promise<{ success: boolean }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    // Se possui senha cadastrada, exige e valida a senha atual
    if (user.password_hash) {
      if (!dto.currentPassword) {
        throw new BadRequestException('A senha atual é obrigatória.');
      }
      const isCurrentValid = this.verifyPassword(
        dto.currentPassword,
        user.password_hash,
      );
      if (!isCurrentValid) {
        throw new UnauthorizedException('A senha atual informada está incorreta.');
      }
    }

    // Define a nova senha
    user.password_hash = this.hashPassword(dto.newPassword);
    await this.userRepository.save(user);

    // Invalida todas as outras sessões ativas por segurança
    await this.sessionRepository.update(
      { user_id: userId, id: Not(currentSessionId) },
      { is_revoked: true },
    );

    return { success: true };
  }

  async deleteAccount(
    userId: string,
    dto: DeleteAccountDto,
  ): Promise<{ deleted: boolean }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    // Se o usuário possui senha local, exige validação antes da exclusão
    if (user.password_hash) {
      if (!dto.password) {
        throw new BadRequestException('A senha é necessária para confirmar a exclusão da conta.');
      }
      const isPasswordValid = this.verifyPassword(dto.password, user.password_hash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Senha incorreta.');
      }
    }

    // 1. Limpeza de arquivos físicos do usuário (Storage)
    try {
      const watermarks = await this.watermarkRepository.find({
        where: { user_id: userId },
      });
      for (const wm of watermarks) {
        if (wm.storage_path) {
          await this.storageService.deleteFile(wm.storage_path);
        }
      }

      const videoJobs = await this.videoJobRepository.find({
        where: { user_id: userId },
      });
      for (const job of videoJobs) {
        if (job.final_video_path) {
          await this.storageService.deleteFile(job.final_video_path);
        }
      }
    } catch (storageErr: any) {
      this.logger.warn(`Falha na limpeza de arquivos no storage: ${storageErr.message}`);
    }

    // 2. Exclusão em cascata do usuário no banco (remove sessões, watermarks e video_jobs)
    await this.userRepository.remove(user);
    this.logger.log(`Conta do usuário ${userId} excluída permanentemente com sucesso.`);

    return { deleted: true };
  }

  async getRecoveryCodes(userId: string): Promise<{ recovery_codes: string[] }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.is_two_factor_enabled || !user.recovery_codes) {
      throw new BadRequestException('2FA não está ativo ou não há códigos de recuperação disponíveis.');
    }
    const decryptedCodes = user.recovery_codes.map((c) =>
      this.encryptionService.decrypt(c),
    );
    return { recovery_codes: decryptedCodes };
  }

  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return UserResponseDto.fromEntity(user)!;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (dto.email) {
      const emailNormalized = dto.email.trim().toLowerCase();
      if (emailNormalized !== user.email) {
        const existing = await this.userRepository.findOne({
          where: { email: emailNormalized },
        });
        if (existing && existing.id !== userId) {
          throw new ConflictException('Já existe um usuário cadastrado com este e-mail.');
        }
        user.email = emailNormalized;
      }
    }

    if (dto.name) {
      user.name = dto.name.trim();
    }

    const saved = await this.userRepository.save(user);
    return UserResponseDto.fromEntity(saved)!;
  }

  async unlinkGoogle(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    if (!user.password_hash) {
      throw new BadRequestException(
        'Cadastre uma senha local na aba Segurança antes de desvincular sua conta Google.',
      );
    }
    user.google_id = null;
    user.auth_provider = AuthProvider.LOCAL;
    const saved = await this.userRepository.save(user);
    return UserResponseDto.fromEntity(saved)!;
  }
}
