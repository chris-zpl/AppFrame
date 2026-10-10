import { IsNotEmpty, IsString } from 'class-validator';

export class ScanChannelDto {
  @IsNotEmpty({ message: 'A URL do canal ou @handle é obrigatória.' })
  @IsString({ message: 'A URL do canal deve ser uma cadeia de caracteres válida.' })
  channelUrl: string;
}
