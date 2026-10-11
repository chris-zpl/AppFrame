import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';

export class DownloadBatchItemDto {
  @IsNotEmpty({ message: 'A URL do vídeo é obrigatória.' })
  @IsUrl({}, { message: 'Informe uma URL válida para o vídeo.' })
  url: string;

  @IsOptional()
  @IsString({ message: 'O título do vídeo deve ser um texto.' })
  title?: string;
}

export class DownloadBatchDto {
  @IsArray({ message: 'A lista de vídeos deve ser um array.' })
  @ValidateNested({ each: true })
  @Type(() => DownloadBatchItemDto)
  videos: DownloadBatchItemDto[];
}
