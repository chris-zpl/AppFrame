import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload, AuthenticatedUser } from '../interfaces/jwt-payload.interface';
import { UserSession } from '../../users/entities/user-session.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
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

    return {
      userId: payload.sub,
      email: payload.email,
      sessionId: payload.sessionId || '',
    };
  }
}
