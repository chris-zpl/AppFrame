import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsOptional()
  @IsString({ message: 'O refresh token deve ser uma cadeia de caracteres válida.' })
  refreshToken?: string;
}
