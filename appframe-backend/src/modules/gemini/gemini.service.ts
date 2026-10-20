import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Inject,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenAI } from '@google/genai';
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';
import * as path from 'path';

import { User } from '../users/entities/user.entity';
import { SystemSetting } from '../admin/entities/system-setting.entity';
import { EncryptionService } from '../../core/security/encryption.service';
import { DownloadService } from '../media/services/download.service';
import { FFmpegService } from '../media/services/ffmpeg.service';
import {
  AudioTimestampSegment,
  TranscriptionResult,
} from './interfaces/gemini-stt.interface';
import {
  SynthesizeSpeechOptions,
  SynthesizeSpeechResult,
} from './interfaces/gemini-tts.interface';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly modelName: string;
  private readonly ttsDir = path.resolve(process.cwd(), 'storage/temp/tts');

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SystemSetting)
    private readonly settingRepository: Repository<SystemSetting>,
    private readonly encryptionService: EncryptionService,
    @Optional()
    @Inject(forwardRef(() => DownloadService))
    private readonly downloadService?: DownloadService,
    @Optional()
    @Inject(forwardRef(() => FFmpegService))
    private readonly ffmpegService?: FFmpegService,
  ) {
    this.modelName = this.configService.get<string>('GEMINI_MODEL', 'gemini-3.8-flash');
    this.ensureDirs();
  }

  private async ensureDirs(): Promise<void> {
    try {
      await fsPromises.mkdir(this.ttsDir, { recursive: true });
    } catch (err: any) {
      this.logger.error(`Falha ao criar pasta TTS: ${err.message}`);
    }
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
    const isAudio = params.config?.responseModalities?.includes('AUDIO');
    const defaultCandidates = isAudio
      ? [
          params.model || this.modelName,
          'gemini-3.8-flash',
          'gemini-3.5-flash-lite',
          'gemini-3-flash-preview',
          'gemini-3.8-flash-tts',
          'gemini-flash-latest',
        ]
      : [
          params.model || this.modelName,
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

        // Erros de autenticação (chave inválida) devem ser repassados de imediato
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
   * Obtém a chave de API global do Gemini configurada pelo Super-Admin ou no ambiente.
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

    const envKey = this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
    if (envKey && envKey.trim()) {
      return envKey.trim();
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
   * Conexão retrocompatível de conta (descontinuada em favor do gerenciamento central pelo Super-Admin).
   */
  async connectAccount(_userId: string, _apiKey: string): Promise<{ connected: boolean }> {
    throw new BadRequestException(
      'A configuração da chave de API do Google Gemini é centralizada no Painel de Administração pelo Super-Admin.',
    );
  }

  /**
   * Desconexão retrocompatível de conta do usuário.
   */
  async disconnectAccount(_userId: string): Promise<{ connected: boolean }> {
    throw new BadRequestException(
      'A configuração da chave de API do Google Gemini é centralizada no Painel de Administração pelo Super-Admin.',
    );
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
   * Gera legendas dinâmicas sincronizadas via Gemini utilizando a conta conectada do usuário.
   * Suporta:
   * 1. Áudio do vídeo atual no Studio via previewId ou sourceUrl (extração automática via FFmpeg);
   * 2. Arquivo de áudio/vídeo enviado diretamente pelo usuário (STT multimodal);
   * 3. Tema/Roteiro do vídeo para geração criativa via Gemini.
   */
  async generateSubtitles(
    userId: string,
    params: {
      audioBuffer?: Buffer;
      audioPath?: string;
      previewId?: string;
      sourceUrl?: string;
      trimStart?: number;
      trimEnd?: number;
      mimeType?: string;
      title?: string;
      context?: string;
      durationSeconds?: number;
      language?: string;
    },
  ): Promise<TranscriptionResult> {
    // 1. Áudio ou arquivo já fornecido diretamente
    if (params.audioBuffer || params.audioPath) {
      return this.transcribeAudio(userId, {
        audioBuffer: params.audioBuffer,
        audioPath: params.audioPath,
        mimeType: params.mimeType,
        language: params.language,
      });
    }

    // 2. Extração automática do áudio do vídeo atual carregado no Studio via previewId ou sourceUrl
    if ((params.previewId || params.sourceUrl) && this.downloadService && this.ffmpegService) {
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
          const { audioBuffer, mimeType } =
            await this.ffmpegService.extractAudioForTranscription(videoFilePath, {
              trimStart: params.trimStart,
              trimEnd: params.trimEnd,
            });

          return await this.transcribeAudio(userId, {
            audioBuffer,
            mimeType,
            language: params.language,
          });
        }
      } catch (extractErr: any) {
        this.logger.warn(`Falha na extração de áudio do preview: ${extractErr.message}`);
        // Se a extração falhar mas o usuário tiver informado contexto, tenta geração por contexto
        if (!params.context && !params.title) {
          throw new BadRequestException(
            `Não foi possível extrair o áudio do vídeo para transcrição: ${extractErr.message}`,
          );
        }
      }
    }

    const ai = await this.getClientForUser(userId);
    const topicText = (params.context || params.title || '').trim();
    if (!topicText) {
      throw new BadRequestException(
        'Nenhum áudio encontrado e nenhum tema/roteiro foi informado para o Gemini.',
      );
    }

    const duration = Math.max(5, Math.min(180, Number(params.durationSeconds) || 15));
    const language = params.language || 'pt-BR';

    try {
      const prompt = `Você é um gerador profissional de legendas dinâmicas sincronizadas para vídeos curtos (Shorts/Reels).
Com base no seguinte título/roteiro/contexto do vídeo:
"${topicText}"

Gere as legendas dinâmicas faladas e sincronizadas cobrindo uma duração de aproximadamente ${duration} segundos no idioma ${language}.
Divida em blocos curtos e impactantes (2 a 5 palavras por bloco, estilo retenção dinâmica), sem sobreposição de tempo.
Retorne estritamente um JSON válido no seguinte formato:
{
  "fullText": "Texto corrido completo das legendas...",
  "language": "${language}",
  "segments": [
    { "start": 0.00, "end": 1.80, "text": "Primeira frase curta" },
    { "start": 1.85, "end": 3.60, "text": "Segunda frase curta" }
  ]
}`;

      const response = await this.generateContentWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const rawJsonText = response.text || '';
      const parsed = JSON.parse(rawJsonText);

      const segments: AudioTimestampSegment[] = (parsed.segments || [])
        .map((seg: any) => ({
          start: typeof seg.start === 'number' ? Number(seg.start.toFixed(2)) : 0.0,
          end: typeof seg.end === 'number' ? Number(seg.end.toFixed(2)) : 2.0,
          text: String(seg.text || '').trim(),
        }))
        .filter((seg: AudioTimestampSegment) => seg.text.length > 0);

      if (segments.length === 0) {
        throw new Error('O modelo não retornou segmentos de legenda válidos.');
      }

      return {
        fullText: parsed.fullText || segments.map((s) => s.text).join(' '),
        language: parsed.language || language,
        segments,
      };
    } catch (err: any) {
      this.handleGeminiError(err, `Erro ao gerar legendas no Gemini para usuário ${userId}`);
    }
  }

  /**
   * Transcrição de áudio com extração determinística de marcações de tempo (timestamps)
   * usando exclusivamente a conta Google AI Studio vinculada pelo usuário.
   */
  async transcribeAudio(
    userId: string,
    params: {
      audioBuffer?: Buffer;
      audioPath?: string;
      mimeType?: string;
      language?: string;
    },
  ): Promise<TranscriptionResult> {
    const ai = await this.getClientForUser(userId);
    let buffer = params.audioBuffer;
    const mimeType = params.mimeType || 'audio/mp3';

    if (!buffer && params.audioPath) {
      const resolvedPath = path.isAbsolute(params.audioPath)
        ? path.normalize(params.audioPath)
        : path.resolve(process.cwd(), params.audioPath);

      // Blindagem estrita contra Path Traversal e Leitura Arbitrária de Arquivos (CWE-22)
      const allowedRoots = [
        path.resolve(process.cwd(), 'storage'),
        path.resolve(process.cwd(), 'uploads'),
      ];
      const isInsideAllowedDir = allowedRoots.some(
        (root) => resolvedPath === root || resolvedPath.startsWith(root + path.sep),
      );

      if (!isInsideAllowedDir) {
        throw new BadRequestException('Acesso negado: caminho de arquivo fora do diretório permitido.');
      }

      if (!fs.existsSync(resolvedPath)) {
        throw new BadRequestException(`Arquivo de áudio não encontrado em: ${params.audioPath}`);
      }
      buffer = await fsPromises.readFile(resolvedPath);
    }

    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Buffer ou caminho de áudio válido é obrigatório para transcrição.');
    }

    try {
      this.logger.log(`Enviando mídia (${buffer.length} bytes) para o modelo Gemini: ${this.modelName}`);

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
      const parsed = JSON.parse(rawJsonText);

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

  /**
   * Geração de áudio sintetizado (TTS) a partir de texto digitado pelo usuário
   * usando exclusivamente a conta Google AI Studio vinculada pelo usuário.
   */
  async synthesizeSpeech(
    userId: string,
    options: SynthesizeSpeechOptions,
  ): Promise<SynthesizeSpeechResult> {
    if (!options.text || options.text.trim().length === 0) {
      throw new BadRequestException('O texto para síntese de voz não pode estar vazio.');
    }

    const ai = await this.getClientForUser(userId);
    await this.ensureDirs();
    const cleanText = options.text.trim();
    const voiceName = options.voiceName || 'Puck';
    const filename = `narration_${Date.now()}_${Math.random().toString(36).substring(7)}.wav`;
    const outputPath = path.join(this.ttsDir, filename);

    try {
      this.logger.log(`Sintetizando fala via Gemini para o texto (${cleanText.length} chars) com voz: ${voiceName}`);

      const response = await this.generateContentWithFallback(ai, {
        contents: cleanText,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
      });

      const candidate = response.candidates?.[0];
      const audioPart = candidate?.content?.parts?.find(
        (part: any) => part.inlineData && part.inlineData.data,
      );

      if (!audioPart || !audioPart.inlineData?.data) {
        throw new Error('O modelo Gemini não retornou dados de áudio.');
      }

      const audioBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
      const mimeType = audioPart.inlineData.mimeType || 'audio/wav';

      await fsPromises.writeFile(outputPath, audioBuffer);
      const durationEstimate = Math.max(1, Number((cleanText.length / 15).toFixed(2)));

      return {
        audioBuffer,
        mimeType,
        savedFilePath: path.relative(process.cwd(), outputPath),
        durationEstimateSeconds: durationEstimate,
      };
    } catch (err: any) {
      this.handleGeminiError(err, 'Chamada de síntese Gemini falhou');
    }
  }
}
