import { IsNotEmpty, IsUrl } from 'class-validator';

export class ScrapeRequestDto {
  @IsNotEmpty({ message: 'A URL do vídeo é obrigatória.' })
  @IsUrl({}, { message: 'Informe uma URL válida.' })
  url: string;
}
