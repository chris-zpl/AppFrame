import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ScanMoreDto {
  @IsNotEmpty({ message: 'A URL do canal ou @handle é obrigatória.' })
  @IsString({ message: 'A URL do canal deve ser uma cadeia de caracteres válida.' })
  channelUrl: string;

  @IsOptional()
  @IsString()
  type?: 'all' | 'long' | 'shorts';
}
