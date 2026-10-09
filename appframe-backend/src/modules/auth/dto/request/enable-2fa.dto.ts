import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Enable2faDto {
  @IsNotEmpty({ message: 'O código de verificação é obrigatório.' })
  @IsString()
  @Length(6, 6, { message: 'O código TOTP deve conter exatamente 6 dígitos.' })
  token: string;
}
