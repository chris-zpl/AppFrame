import { IsNotEmpty, IsUrl } from 'class-validator';

export class PreparePreviewDto {
  @IsNotEmpty({ message: 'A URL de origem do vídeo é obrigatória.' })
  @IsUrl({}, { message: 'Informe uma URL válida para o preview.' })
  source_url: string;
}
