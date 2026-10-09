import { Exclude, Expose, plainToInstance } from 'class-transformer';
import { UserSession } from '../../../users/entities/user-session.entity';

@Exclude()
export class ActiveSessionResponseDto {
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
  is_current: boolean;

  @Expose()
  last_active_at: Date;

  @Expose()
  created_at: Date;

  @Expose()
  expires_at: Date;

  static fromEntity(
    session: UserSession,
    currentSessionId?: string,
  ): ActiveSessionResponseDto {
    const dto = plainToInstance(ActiveSessionResponseDto, session, {
      excludeExtraneousValues: true,
    });
    dto.is_current = !!currentSessionId && session.id === currentSessionId;
    return dto;
  }

  static fromEntities(
    sessions: UserSession[],
    currentSessionId?: string,
  ): ActiveSessionResponseDto[] {
    return sessions.map((s) =>
      ActiveSessionResponseDto.fromEntity(s, currentSessionId),
    );
  }
}
