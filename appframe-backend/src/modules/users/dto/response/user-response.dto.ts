import { Exclude, Expose, plainToInstance } from 'class-transformer';
import { AuthProvider } from '../../enums/auth-provider.enum';
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
  google_id: string | null;

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
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  static fromEntities(users: User[]): UserResponseDto[] {
    if (!users) return [];
    return users.map((user) => UserResponseDto.fromEntity(user));
  }
}
