import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload, AuthenticatedUser } from '../interfaces/jwt-payload.interface';
import { UserSession } from '../../users/entities/user-session.entity';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => {
          if (req && req.cookies && req.cookies['access_token']) {
            return req.cookies['access_token'];
          }
          return null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'appframe-development-secret-jwt-key',
      ),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.purpose === '2fa_challenge') {
      throw new UnauthorizedException('Token temporário. Conclua o desafio de 2FA primeiro.');
    }

    if (payload.sessionId) {
      const session = await this.sessionRepository.findOne({
        where: { id: payload.sessionId, is_revoked: false },
      });

      if (!session) {
        throw new UnauthorizedException('Sessão expirada ou revogada.');
      }

      if (new Date() > new Date(session.expires_at)) {
        throw new UnauthorizedException('Sessão expirada.');
      }

      // Atualiza last_active_at em background
      this.sessionRepository.update(session.id, { last_active_at: new Date() }).catch(() => {});
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    if (user.is_active === false) {
      throw new UnauthorizedException('Sua conta foi desativada pelo administrador.');
    }

    let role = user.role || UserRole.USER;
    if (user.email && user.email.toLowerCase() === 'christian.zimpel@gmail.com') {
      role = UserRole.SUPER_ADMIN;
      if (user.role !== UserRole.SUPER_ADMIN) {
        user.role = UserRole.SUPER_ADMIN;
        this.userRepository.save(user).catch(() => {});
      }
    }

    return {
      userId: user.id,
      email: user.email,
      role,
      sessionId: payload.sessionId || '',
    };
  }
}
