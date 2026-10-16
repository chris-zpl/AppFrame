import { IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'O token de redefinição é obrigatório.' })
  token: string;

  @IsNotEmpty({ message: 'A nova senha é obrigatória.' })
  @MinLength(8, { message: 'A nova senha deve conter no mínimo 8 caracteres.' })
  newPassword: string;
}
