import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { TranscribeAudioDto } from './dto/transcribe-audio.dto';
import { SynthesizeSpeechDto } from './dto/synthesize-speech.dto';
import { TranscriptionResult } from './interfaces/gemini-stt.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('gemini')
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Post('transcribe')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async transcribe(
    @Body() dto: TranscribeAudioDto,
  ): Promise<TranscriptionResult> {
    const buffer = dto.audioBase64
      ? Buffer.from(dto.audioBase64, 'base64')
      : undefined;

    return this.geminiService.transcribeAudio({
      audioBuffer: buffer,
      audioPath: dto.audioPath,
      mimeType: dto.mimeType,
      language: dto.language,
    });
  }

  @Post('tts')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async synthesizeSpeech(@Body() dto: SynthesizeSpeechDto): Promise<{
    mimeType: string;
    savedFilePath?: string;
    audioBase64: string;
    durationEstimateSeconds?: number;
  }> {
    const result = await this.geminiService.synthesizeSpeech({
      text: dto.text,
      voiceName: dto.voiceName,
      languageCode: dto.languageCode,
    });

    return {
      mimeType: result.mimeType,
      savedFilePath: result.savedFilePath,
      audioBase64: result.audioBuffer.toString('base64'),
      durationEstimateSeconds: result.durationEstimateSeconds,
    };
  }
}
