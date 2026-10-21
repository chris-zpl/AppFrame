import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class ScanMoreDto {
  @IsNotEmpty({ message: 'A URL do canal ou @handle é obrigatória.' })
  @IsString({ message: 'A URL do canal deve ser uma cadeia de caracteres válida.' })
  channelUrl: string;

  @IsOptional()
  @IsIn(['all', 'long', 'shorts'], {
    message: 'O tipo deve ser "all", "long" ou "shorts".',
  })
  type?: 'all' | 'long' | 'shorts';
}
