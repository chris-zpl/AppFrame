import { IsNotEmpty, IsString } from 'class-validator';

export class Verify2faDto {
  @IsNotEmpty({ message: 'O token temporário de desafio é obrigatório.' })
  @IsString()
  tempToken: string;

  @IsNotEmpty({ message: 'O código de autenticação ou recuperação é obrigatório.' })
  @IsString()
  token: string;
}
