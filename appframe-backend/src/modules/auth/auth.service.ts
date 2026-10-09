import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { UserSession } from '../users/entities/user-session.entity';
import { AuthProvider } from '../users/enums/auth-provider.enum';
import { RegisterDto } from './dto/request/register.dto';
import { LoginDto } from './dto/request/login.dto';
import { AuthResponseDto } from './dto/response/auth-response.dto';
import { UserResponseDto } from '../users/dto/response/user-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
  ) {}

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .scryptSync(password, salt, 64)
      .toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, stored: string): boolean {
    const [salt, key] = stored.split(':');
    if (!salt || !key) return false;
    const hash = crypto
      .scryptSync(password, salt, 64)
      .toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(key, 'hex'));
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async register(
    dto: RegisterDto,
    meta?: { ip?: string; userAgent?: string; deviceName?: string },
  ): Promise<AuthResponseDto> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Já existe um usuário cadastrado com este e-mail.');
    }

    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      password_hash: this.hashPassword(dto.password),
      auth_provider: AuthProvider.LOCAL,
      is_two_factor_enabled: false,
    });

    const savedUser = await this.userRepository.save(user);
    return this.createAuthSession(savedUser, meta);
  }

  async login(
    dto: LoginDto,
    meta?: { ip?: string; userAgent?: string; deviceName?: string },
  ): Promise<AuthResponseDto> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const isValid = this.verifyPassword(dto.password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    return this.createAuthSession(user, meta);
  }

  private async createAuthSession(
    user: User,
    meta?: { ip?: string; userAgent?: string; deviceName?: string },
  ): Promise<AuthResponseDto> {
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const rawAccessToken = crypto.randomBytes(32).toString('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 dias de validade da sessão

    const session = this.sessionRepository.create({
      user_id: user.id,
      refresh_token_hash: this.hashToken(rawRefreshToken),
      ip_address: meta?.ip || null,
      user_agent: meta?.userAgent || null,
      device_name: meta?.deviceName || null,
      is_revoked: false,
      last_active_at: new Date(),
      expires_at: expiresAt,
    });

    await this.sessionRepository.save(session);

    const safeUser = UserResponseDto.fromEntity(user)!;

    return {
      access_token: rawAccessToken,
      refresh_token: rawRefreshToken,
      user: safeUser,
    };
  }
}
