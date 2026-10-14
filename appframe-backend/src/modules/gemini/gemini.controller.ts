import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GeminiService } from './gemini.service';
import { TranscribeAudioDto } from './dto/transcribe-audio.dto';
import { SynthesizeSpeechDto } from './dto/synthesize-speech.dto';
import { TranscriptionResult } from './interfaces/gemini-stt.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('gemini')
@UseGuards(JwtAuthGuard)
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Get('status')
  @HttpCode(HttpStatus.OK)
  async getStatus(
    @CurrentUser('userId') userId: string,
  ): Promise<{ connected: boolean }> {
    return this.geminiService.getStatus(userId);
  }

  @Get('connect')
  @HttpCode(HttpStatus.OK)
  async getConnectStatus(
    @CurrentUser('userId') userId: string,
  ): Promise<{ connected: boolean }> {
    return this.geminiService.getStatus(userId);
  }

  @Post('connect')
  @HttpCode(HttpStatus.OK)
  async connectAccount(
    @CurrentUser('userId') userId: string,
    @Body() body: { apiKey: string },
  ): Promise<{ connected: boolean }> {
    return this.geminiService.connectAccount(userId, body?.apiKey);
  }

  @Delete('disconnect')
  @HttpCode(HttpStatus.OK)
  async disconnectAccount(
    @CurrentUser('userId') userId: string,
  ): Promise<{ connected: boolean }> {
    return this.geminiService.disconnectAccount(userId);
  }

  @Post('subtitles')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  async generateSubtitles(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file?: Express.Multer.File,
    @Body()
    body?: {
      title?: string;
      context?: string;
      durationSeconds?: number | string;
      language?: string;
      audioBase64?: string;
      mimeType?: string;
    },
  ): Promise<TranscriptionResult> {
    const buffer = file?.buffer
      ? file.buffer
      : body?.audioBase64
        ? Buffer.from(body.audioBase64, 'base64')
        : undefined;

    return this.geminiService.generateSubtitles(userId, {
      audioBuffer: buffer,
      mimeType: file?.mimetype || body?.mimeType,
      title: body?.title,
      context: body?.context,
      durationSeconds: body?.durationSeconds ? Number(body.durationSeconds) : undefined,
      language: body?.language,
    });
  }

  @Post('transcribe')
  @HttpCode(HttpStatus.OK)
  async transcribe(
    @CurrentUser('userId') userId: string,
    @Body() dto: TranscribeAudioDto,
  ): Promise<TranscriptionResult> {
    const buffer = dto.audioBase64
      ? Buffer.from(dto.audioBase64, 'base64')
      : undefined;

    return this.geminiService.transcribeAudio(userId, {
      audioBuffer: buffer,
      audioPath: dto.audioPath,
      mimeType: dto.mimeType,
      language: dto.language,
    });
  }

  @Post('tts')
  @HttpCode(HttpStatus.OK)
  async synthesizeSpeech(
    @CurrentUser('userId') userId: string,
    @Body() dto: SynthesizeSpeechDto,
  ): Promise<{
    mimeType: string;
    savedFilePath?: string;
    audioBase64: string;
    durationEstimateSeconds?: number;
  }> {
    const result = await this.geminiService.synthesizeSpeech(userId, {
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
