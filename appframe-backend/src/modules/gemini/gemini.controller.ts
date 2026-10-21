import {
  Controller,
  Get,
  Post,
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

  @Post('transcribe')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  async transcribe(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file?: Express.Multer.File,
    @Body() dto?: TranscribeAudioDto,
  ): Promise<TranscriptionResult> {
    const buffer = file?.buffer
      ? file.buffer
      : dto?.audioBase64
        ? Buffer.from(dto.audioBase64, 'base64')
        : undefined;

    return this.geminiService.transcribeAudio(userId, {
      audioBuffer: buffer,
      previewId: dto?.previewId,
      sourceUrl: dto?.sourceUrl,
      trimStart: dto?.trimStart !== undefined ? Number(dto.trimStart) : undefined,
      trimEnd: dto?.trimEnd !== undefined ? Number(dto.trimEnd) : undefined,
      mimeType: file?.mimetype || dto?.mimeType,
      language: dto?.language,
    });
  }
}
