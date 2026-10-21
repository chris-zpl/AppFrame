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
import { Transform, Type } from 'class-transformer';
import { VideoPlatform } from '../../enums/video-platform.enum';
import { SubtitleConfig } from '../../interfaces/subtitle-config.interface';

export class CreateVideoJobDto {
  @IsNotEmpty({ message: 'A URL de origem do vídeo é obrigatória.' })
  @IsUrl({}, { message: 'Informe uma URL válida.' })
  source_url: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return VideoPlatform.YOUTUBE;
    const str = String(value).toLowerCase().trim();
    if (str.includes('short') || str.includes('youtube')) return VideoPlatform.YOUTUBE;
    if (str.includes('tiktok')) return VideoPlatform.TIKTOK;
    if (str.includes('reel') || str.includes('instagram')) return VideoPlatform.INSTAGRAM;
    return value;
  })
  @IsEnum(VideoPlatform, { message: 'Plataforma não suportada.' })
  platform?: VideoPlatform;

  @IsOptional()
  @IsString()
  aspect_ratio?: string;

  @IsOptional()
  @IsString()
  original_title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  trim_start?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  trim_end?: number;

  @IsOptional()
  @IsUUID('4', { message: 'O ID da marca d’água deve ser um UUID válido.' })
  watermark_id?: string;

  @IsOptional()
  @IsString()
  watermark_position?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  watermark_scale?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  watermark_opacity?: number;

  @IsOptional()
  subtitle_config?: SubtitleConfig;
}
