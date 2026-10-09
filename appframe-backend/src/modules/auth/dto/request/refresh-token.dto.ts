import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'O refresh token é obrigatório.' })
  @IsString({ message: 'O refresh token deve ser uma cadeia de caracteres válida.' })
  refreshToken: string;
}
