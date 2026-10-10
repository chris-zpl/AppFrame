import { IsOptional, IsString } from 'class-validator';

export class TranscribeAudioDto {
  @IsOptional()
  @IsString({ message: 'O caminho do arquivo de áudio deve ser uma string válida.' })
  audioPath?: string;

  @IsOptional()
  @IsString({ message: 'O conteúdo em base64 deve ser uma string válida.' })
  audioBase64?: string;

  @IsOptional()
  @IsString({ message: 'O MIME type do áudio deve ser informado (ex: audio/mp3, audio/wav).' })
  mimeType?: string;

  @IsOptional()
  @IsString()
  language?: string;
}
