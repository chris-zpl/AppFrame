import { Exclude, Expose, plainToInstance } from 'class-transformer';
import { AuthProvider } from '../../enums/auth-provider.enum';
import { UserRole } from '../../enums/user-role.enum';
import { User } from '../../entities/user.entity';

@Exclude()
export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  email: string;

  @Expose()
  role: UserRole;

  @Expose()
  is_active: boolean;

  @Expose()
  is_google_linked: boolean;

  @Expose()
  google_id: string | null;

  @Expose()
  google_email: string | null;

  @Expose()
  email_changed_at: Date | null;

  @Expose()
  auth_provider: AuthProvider;

  @Expose()
  is_two_factor_enabled: boolean;

  @Expose()
  created_at: Date;
  @Expose()
  updated_at: Date;

  /**
   * Converte uma entidade ou objeto User para DTO sanitizado,
   * garantindo que nenhum campo confidenciais (hash, segredo 2FA, etc.) seja retornado.
   */
  static fromEntity(user: User | null | undefined): UserResponseDto | null {
    if (!user) return null;
    const dto = plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
    // Garantia de segurança da plataforma
    dto.role = user.role || UserRole.USER;
    dto.is_active = user.is_active !== undefined ? user.is_active : true;
    dto.is_google_linked = Boolean(user.google_id || user.auth_provider === AuthProvider.GOOGLE);
    dto.google_id = null; // Higienizado: ID numérico interno do Google não deve vazar para a interface
    dto.google_email = user.google_email || null;
    dto.email_changed_at = user.email_changed_at || null;
    return dto;
  }

  static fromEntities(users: User[]): UserResponseDto[] {
    if (!users) return [];
    return users.map((user) => UserResponseDto.fromEntity(user));
  }
}
