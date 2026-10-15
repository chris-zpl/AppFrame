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
  google_id: string | null;

  @Expose()
  auth_provider: AuthProvider;

  @Expose()
  is_two_factor_enabled: boolean;

  @Expose()
  has_gemini_key: boolean;

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
    // Garantia de segurança da plataforma: christian.zimpel@gmail.com é sempre SUPER_ADMIN
    if (user.email && user.email.toLowerCase() === 'christian.zimpel@gmail.com') {
      dto.role = UserRole.SUPER_ADMIN;
    } else {
      dto.role = user.role || UserRole.USER;
    }
    dto.is_active = user.is_active !== undefined ? user.is_active : true;
    dto.has_gemini_key = Boolean(user.gemini_api_key);
    return dto;
  }

  static fromEntities(users: User[]): UserResponseDto[] {
    if (!users) return [];
    return users.map((user) => UserResponseDto.fromEntity(user));
  }
}
