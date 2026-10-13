import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'O nome deve ser uma cadeia de caracteres.' })
  @MinLength(2, { message: 'O nome deve conter no mínimo 2 caracteres.' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email?: string;
}
