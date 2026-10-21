import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class TranscribeAudioDto {
  @IsOptional()
  @IsString({ message: 'O conteúdo em base64 deve ser uma string válida.' })
  audioBase64?: string;

  @IsOptional()
  @IsString({ message: 'O MIME type do áudio deve ser informado (ex: audio/mp3, audio/wav).' })
  mimeType?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  previewId?: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  trimStart?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  trimEnd?: number;
}
