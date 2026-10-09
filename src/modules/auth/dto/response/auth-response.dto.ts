import { Exclude, Expose, Type } from 'class-transformer';
import { UserResponseDto } from '../../../users/dto/response/user-response.dto';

@Exclude()
export class AuthResponseDto {
  @Expose()
  access_token: string;

  @Expose()
  refresh_token: string;

  @Expose()
  @Type(() => UserResponseDto)
  user: UserResponseDto;
}
