import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  IsNumber,
  Min,
} from 'class-validator';
import { VideoPlatform } from '../../enums/video-platform.enum';
import { SubtitleConfig } from '../../interfaces/subtitle-config.interface';

export class CreateVideoJobDto {
  @IsNotEmpty({ message: 'A URL de origem do vídeo é obrigatória.' })
  @IsUrl({}, { message: 'Informe uma URL válida.' })
  source_url: string;

  @IsOptional()
  @IsEnum(VideoPlatform, { message: 'Plataforma não suportada.' })
  platform?: VideoPlatform;

  @IsOptional()
  @IsString()
  original_title?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  trim_start?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  trim_end?: number;

  @IsOptional()
  @IsUUID('4', { message: 'O ID da marca d’água deve ser um UUID válido.' })
  watermark_id?: string;

  @IsOptional()
  subtitle_config?: SubtitleConfig;
}
