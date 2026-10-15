import { IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'O token de redefinição é obrigatório.' })
  token: string;

  @IsNotEmpty({ message: 'A nova senha é obrigatória.' })
  @MinLength(6, { message: 'A nova senha deve conter no mínimo 6 caracteres.' })
  newPassword: string;
}
