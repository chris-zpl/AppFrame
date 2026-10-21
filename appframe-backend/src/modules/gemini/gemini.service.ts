import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  Inject,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';

import { SystemSetting } from '../admin/entities/system-setting.entity';
import { EncryptionService } from '../../core/security/encryption.service';
import { DownloadService } from '../media/services/download.service';
import { FFmpegService } from '../media/services/ffmpeg.service';
import {
  AudioTimestampSegment,
  TranscriptionResult,
} from './interfaces/gemini-stt.interface';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(SystemSetting)
    private readonly settingRepository: Repository<SystemSetting>,
    private readonly encryptionService: EncryptionService,
    @Optional()
    @Inject(forwardRef(() => DownloadService))
    private readonly downloadService?: DownloadService,
    @Optional()
    @Inject(forwardRef(() => FFmpegService))
    private readonly ffmpegService?: FFmpegService,
  ) {}

  private safeJsonParse<T = any>(rawText: string): T {
    const cleaned = (rawText || '')
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    return JSON.parse(cleaned) as T;
  }

  private async getGlobalModelName(): Promise<string> {
    try {
      const setting = await this.settingRepository.findOne({
        where: { key: 'GEMINI_MODEL' },
      });
      if (setting?.value && setting.value.trim().length > 0) {
        return setting.value.trim();
      }
    } catch (err: any) {
      this.logger.warn(`Falha ao consultar GEMINI_MODEL no banco: ${err?.message}`);
    }
    return this.configService.get<string>('GEMINI_MODEL', 'gemini-2.5-flash');
  }

  private isQuotaOrOverloadError(err: any): boolean {
    const msg = (err?.message || String(err)).toLowerCase();
    const status = Number(err?.status || err?.code || 0);
    return (
      status === 429 ||
      msg.includes('resource has been exhausted') ||
      msg.includes('resource_exhausted') ||
      msg.includes('quota') ||
      msg.includes('rate limit') ||
      msg.includes('too many requests')
    );
  }

  private handleGeminiError(err: any, contextDescription: string): never {
    if (err instanceof BadRequestException || err instanceof ForbiddenException) {
      throw err;
    }

    if (this.isQuotaOrOverloadError(err)) {
      throw new BadRequestException(
        'A cota gratuita do assistente de inteligência artificial (Gemini) foi atingida temporariamente. Por favor, aguarde alguns instantes ou contate o administrador da plataforma.',
      );
    }

    this.logger.error(`${contextDescription}: ${err?.message || err}`);
    throw new BadRequestException(
      `Falha na integração com o Google Gemini: ${err?.message || err}`,
    );
  }

  /**
   * Executa a chamada generateContent com fallback automático de modelos caso o modelo
   * configurado esteja indisponível, depreciado pelo Google ou sob alta demanda temporária (503).
   */
  async generateContentWithFallback(
    ai: GoogleGenAI,
    params: {
      model?: string;
      contents: any;
      config?: any;
    },
  ): Promise<any> {
    const activeModel = params.model || (await this.getGlobalModelName());
    const defaultCandidates = [
      activeModel,
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-flash-latest',
    ];

    const candidateModels = Array.from(new Set(defaultCandidates)).filter(Boolean);

    let lastError: any = null;
    let quotaHit = false;

    for (const model of candidateModels) {
      try {
        return await ai.models.generateContent({
          ...params,
          model,
        });
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        const status = Number(err?.status || err?.code || 0);

        if (this.isQuotaOrOverloadError(err)) {
          quotaHit = true;
        }

        const isTransientOrModelError =
          msg.includes('is no longer available') ||
          msg.includes('NOT_FOUND') ||
          msg.includes('not found') ||
          msg.includes('high demand') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('exceeded your current quota') ||
          msg.includes('Resource has been exhausted') ||
          status === 404 ||
          status === 503 ||
          status === 429 ||
          status === 500 ||
          status === 502 ||
          status === 504;

        if (isTransientOrModelError) {
          this.logger.warn(
            `Modelo ${model} indisponível ou sobrecarregado no Google Gemini (${msg}). Tentando próximo modelo candidato...`,
          );
          continue;
        }

        throw err;
      }
    }

    if (quotaHit) {
      throw new BadRequestException(
        'A cota gratuita do assistente de inteligência artificial (Gemini) foi atingida temporariamente. Por favor, aguarde alguns instantes ou contate o administrador da plataforma.',
      );
    }

    this.handleGeminiError(lastError, 'Falha ao executar geração no Gemini');
  }

  /**
   * Obtém a chave de API global do Gemini configurada pelo Super-Admin no banco de dados.
   */
  private async getGlobalApiKey(): Promise<string | null> {
    try {
      const setting = await this.settingRepository.findOne({ where: { key: 'GEMINI_API_KEY' } });
      if (setting?.value) {
        const decrypted = this.encryptionService.decrypt(setting.value);
        if (decrypted && decrypted.trim().length > 0) {
          return decrypted.trim();
        }
      }
    } catch (err: any) {
      this.logger.error(`Falha ao descriptografar chave global do Gemini: ${err.message}`);
    }

    return null;
  }

  /**
   * Obtém o status de conexão da IA Gemini (global pela plataforma).
   */
  async getStatus(_userId?: string): Promise<{ connected: boolean }> {
    const globalKey = await this.getGlobalApiKey();
    return { connected: Boolean(globalKey) };
  }

  /**
   * Instancia o cliente GoogleGenAI utilizando exclusivamente a chave global configurada pelo Super-Admin.
   */
  private async getClientForUser(_userId?: string): Promise<GoogleGenAI> {
    const globalKey = await this.getGlobalApiKey();
    if (globalKey) {
      return new GoogleGenAI({ apiKey: globalKey });
    }

    throw new BadRequestException(
      'O assistente de inteligência artificial (Gemini) ainda não foi configurado na plataforma. Por favor, contate o administrador do sistema.',
    );
  }

  /**
   * Transcrição de áudio com extração determinística de marcações de tempo (timestamps).
   * Suporta buffer direto (upload/base64) ou extração automática a partir de previewId / sourceUrl.
   */
  async transcribeAudio(
    userId: string,
    params: {
      audioBuffer?: Buffer;
      previewId?: string;
      sourceUrl?: string;
      trimStart?: number;
      trimEnd?: number;
      mimeType?: string;
      language?: string;
    },
  ): Promise<TranscriptionResult> {
    let buffer = params.audioBuffer;
    let mimeType = params.mimeType || 'audio/mp3';

    // 1. Extração automática do áudio do vídeo carregado no Studio via previewId ou sourceUrl
    if (
      !buffer &&
      (params.previewId || params.sourceUrl) &&
      this.downloadService &&
      this.ffmpegService
    ) {
      try {
        let videoFilePath: string | null = null;
        if (params.previewId) {
          const candidate = this.downloadService.getPreviewFilePath(params.previewId);
          if (fs.existsSync(candidate)) {
            videoFilePath = candidate;
          }
        }

        if (!videoFilePath && params.sourceUrl) {
          const dl = await this.downloadService.ensurePreviewDownloaded(params.sourceUrl);
          videoFilePath = dl.filePath;
        }

        if (videoFilePath && fs.existsSync(videoFilePath)) {
          this.logger.log(`Extraindo áudio do vídeo no Studio para transcrição STT: ${videoFilePath}`);
          const extracted = await this.ffmpegService.extractAudioForTranscription(videoFilePath, {
            trimStart: params.trimStart,
            trimEnd: params.trimEnd,
          });
          buffer = extracted.audioBuffer;
          mimeType = extracted.mimeType || mimeType;
        }
      } catch (extractErr: any) {
        this.logger.warn(`Falha na extração de áudio do preview: ${extractErr.message}`);
        throw new BadRequestException(
          `Não foi possível extrair o áudio do vídeo para transcrição: ${extractErr.message}`,
        );
      }
    }

    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Buffer de áudio ou vídeo de origem válido é obrigatório para transcrição.');
    }

    const ai = await this.getClientForUser(userId);

    try {
      const activeModel = await this.getGlobalModelName();
      this.logger.log(`Enviando mídia (${buffer.length} bytes) para o modelo Gemini: ${activeModel}`);

      const prompt = `Você é um motor especializado em reconhecimento de fala (STT) para legendagem de vídeo.
Transcreva fielmente todo o conteúdo falado do áudio fornecido, segmentando os trechos falados em frases curtas e naturais (3 a 6 palavras por bloco).
Para cada frase falada, indique os tempos precisos de início (start) e término (end) em segundos (com duas casas decimais).
REGRAS OBRIGATÓRIAS:
1. NÃO sobreponha tempos entre blocos consecutivos (o start do bloco seguinte deve ser maior ou igual ao end do bloco anterior).
2. NÃO gere blocos para silêncios, pausas ou intervalos sem fala.
Retorne estritamente um JSON no seguinte formato:
{
  "fullText": "Texto completo transcrito aqui...",
  "language": "${params.language || 'pt-BR'}",
  "segments": [
    { "start": 0.00, "end": 1.80, "text": "Primeira expressão falada" },
    { "start": 1.85, "end": 3.60, "text": "Segunda expressão falada" }
  ]
}`;

      const response = await this.generateContentWithFallback(ai, {
        contents: [
          {
            inlineData: {
              data: buffer.toString('base64'),
              mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const rawJsonText = response.text || '';
      const parsed = this.safeJsonParse(rawJsonText);

      let lastEnd = 0;
      const rawSegments = Array.isArray(parsed.segments) ? parsed.segments : [];
      const segments: AudioTimestampSegment[] = [];

      for (const seg of rawSegments) {
        let start = typeof seg.start === 'number' ? Number(seg.start.toFixed(2)) : lastEnd;
        let end = typeof seg.end === 'number' ? Number(seg.end.toFixed(2)) : start + 1.5;
        const text = String(seg.text || '').trim();

        if (!text || end <= start) continue;

        if (start < lastEnd) {
          start = lastEnd;
        }
        if (end <= start) {
          end = Number((start + 0.3).toFixed(2));
        }

        segments.push({ start, end, text });
        lastEnd = end;
      }

      return {
        fullText: parsed.fullText || segments.map((s) => s.text).join(' '),
        language: parsed.language || params.language || 'pt-BR',
        segments,
      };
    } catch (err: any) {
      this.handleGeminiError(err, 'Erro na chamada da API Gemini GenAI');
    }
  }
}
