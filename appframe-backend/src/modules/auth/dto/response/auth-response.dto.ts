import { Exclude, Expose, Type } from 'class-transformer';
import { UserResponseDto } from '../../../users/dto/response/user-response.dto';

@Exclude()
export class AuthResponseDto {
  @Expose()
  require_2fa?: boolean;

  @Expose()
  temp_token?: string;

  @Expose()
  access_token?: string;

  @Expose()
  refresh_token?: string;

  @Expose()
  remember_me?: boolean;

  @Expose()
  @Type(() => UserResponseDto)
  user?: UserResponseDto;
}
