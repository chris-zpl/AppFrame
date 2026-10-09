import { Exclude, Expose, plainToInstance } from 'class-transformer';
import { UserSession } from '../../entities/user-session.entity';

@Exclude()
export class UserSessionResponseDto {
  @Expose()
  id: string;

  @Expose()
  user_id: string;

  @Expose()
  ip_address: string | null;

  @Expose()
  user_agent: string | null;

  @Expose()
  device_name: string | null;

  @Expose()
  is_revoked: boolean;

  @Expose()
  last_active_at: Date;

  @Expose()
  created_at: Date;

  @Expose()
  expires_at: Date;

  /**
   * Converte a sessão para DTO sanitizado, garantindo que refresh_token_hash nunca seja exposto.
   */
  static fromEntity(
    session: UserSession | null | undefined,
  ): UserSessionResponseDto | null {
    if (!session) return null;
    return plainToInstance(UserSessionResponseDto, session, {
      excludeExtraneousValues: true,
    });
  }

  static fromEntities(sessions: UserSession[]): UserSessionResponseDto[] {
    if (!sessions) return [];
    return sessions.map((s) => UserSessionResponseDto.fromEntity(s));
  }
}
