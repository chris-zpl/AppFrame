import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SynthesizeSpeechDto {
  @IsNotEmpty({ message: 'O texto para síntese de voz é obrigatório.' })
  @IsString({ message: 'O texto deve ser uma cadeia de caracteres válida.' })
  text: string;

  @IsOptional()
  @IsString({ message: 'A voz deve ser uma opção válida (ex: Puck, Charon, Kore, Fenrir, Aoede).' })
  voiceName?: string;

  @IsOptional()
  @IsString()
  languageCode?: string;
}
