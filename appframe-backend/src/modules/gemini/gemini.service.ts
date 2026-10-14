import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenAI } from '@google/genai';
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';
import * as path from 'path';

import { User } from '../users/entities/user.entity';
import { EncryptionService } from '../../core/security/encryption.service';
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
    private readonly encryptionService: EncryptionService,
  ) {
    this.modelName = this.configService.get<string>('GEMINI_MODEL', 'gemini-3.5-flash-lite');
    this.ensureDirs();
  }

  private async ensureDirs(): Promise<void> {
    try {
      await fsPromises.mkdir(this.ttsDir, { recursive: true });
    } catch (err: any) {
      this.logger.error(`Falha ao criar pasta TTS: ${err.message}`);
    }
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
          'gemini-3.5-flash-lite',
          'gemini-3-flash-preview',
          'gemini-3.8-flash',
          'gemini-3.8-flash-tts',
          'gemini-flash-latest',
        ]
      : [
          params.model || this.modelName,
          'gemini-3.5-flash-lite',
          'gemini-3-flash-preview',
          'gemini-3.1-flash-lite',
          'gemini-3.8-flash',
          'gemini-3.5-flash',
          'gemini-flash-latest',
          'gemini-2.5-flash',
          'gemini-2.5-flash-lite',
        ];

    const candidateModels = Array.from(new Set(defaultCandidates)).filter(Boolean);

    let lastError: any = null;
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

    throw lastError;
  }

  /**
   * Obtém o status de conexão da conta Google AI Studio (Gemini) do usuário.
   */
  async getStatus(userId: string): Promise<{ connected: boolean }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return {
      connected: Boolean(user?.gemini_api_key),
    };
  }

  /**
   * Valida a chave do Google AI Studio na API oficial do Gemini,
   * criptografa com AES-256-GCM e vincula à conta do usuário.
   */
  async connectAccount(userId: string, apiKey: string): Promise<{ connected: boolean }> {
    const cleanKey = (apiKey || '').trim();
    if (!cleanKey || cleanKey.length < 15) {
      throw new BadRequestException(
        'Informe uma chave de API válida do Google AI Studio.',
      );
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Usuário não encontrado.');
    }

    try {
      const testClient = new GoogleGenAI({ apiKey: cleanKey });
      await this.generateContentWithFallback(testClient, {
        contents: 'Responda apenas OK',
      });
    } catch (err: any) {
      this.logger.warn(
        `Falha ao validar chave do Google AI Studio para o usuário ${userId}: ${err.message}`,
      );
      throw new BadRequestException(
        'Não foi possível autenticar no Google Gemini com esta chave. Verifique se a chave do Google AI Studio está correta e ativa.',
      );
    }

    user.gemini_api_key = this.encryptionService.encrypt(cleanKey);
    await this.userRepository.save(user);

    return { connected: true };
  }

  /**
   * Remove o vínculo da chave do Google AI Studio da conta do usuário.
   */
  async disconnectAccount(userId: string): Promise<{ connected: boolean }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Usuário não encontrado.');
    }

    user.gemini_api_key = null;
    await this.userRepository.save(user);

    return { connected: false };
  }

  /**
   * Instancia o cliente GoogleGenAI exclusivamente com a chave vinculada pelo usuário.
   * Nenhuma chave padrão do servidor é utilizada.
   */
  private async getClientForUser(userId: string): Promise<GoogleGenAI> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.gemini_api_key) {
      throw new ForbiddenException(
        'Conecte sua conta do Google AI Studio (Gemini) para habilitar o gerador de legendas.',
      );
    }

    try {
      const decryptedKey = this.encryptionService.decrypt(user.gemini_api_key);
      if (!decryptedKey) {
        throw new Error('Chave descriptografada vazia');
      }
      return new GoogleGenAI({ apiKey: decryptedKey });
    } catch (err: any) {
      this.logger.error(`Erro ao descriptografar chave Gemini do usuário ${userId}: ${err.message}`);
      throw new ForbiddenException(
        'Sua credencial do Google Gemini expirou ou é inválida. Reconecte sua conta no Studio.',
      );
    }
  }

  /**
   * Gera legendas dinâmicas sincronizadas via Gemini utilizando a conta conectada do usuário.
   * Aceita arquivo de áudio/vídeo real (STT multimodal) ou contexto/roteiro do vídeo carregado.
   */
  async generateSubtitles(
    userId: string,
    params: {
      audioBuffer?: Buffer;
      audioPath?: string;
      mimeType?: string;
      title?: string;
      context?: string;
      durationSeconds?: number;
      language?: string;
    },
  ): Promise<TranscriptionResult> {
    if (params.audioBuffer || params.audioPath) {
      return this.transcribeAudio(userId, {
        audioBuffer: params.audioBuffer,
        audioPath: params.audioPath,
        mimeType: params.mimeType,
        language: params.language,
      });
    }

    const ai = await this.getClientForUser(userId);
    const topicText = (params.context || params.title || '').trim();
    if (!topicText) {
      throw new BadRequestException(
        'Envie um arquivo de vídeo/áudio ou informe o tema/roteiro para gerar as legendas pelo Gemini.',
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
      this.logger.error(`Erro ao gerar legendas no Gemini para usuário ${userId}: ${err.message}`);
      throw new InternalServerErrorException(
        `Falha ao gerar legendas no Google Gemini: ${err.message}`,
      );
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
        ? params.audioPath
        : path.resolve(process.cwd(), params.audioPath);

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

      const prompt = `Você é um motor especializado em reconhecimento de fala (STT) para geração de legendas dinâmicas.
Transcreva todo o conteúdo de fala do arquivo fornecido, segmentando os trechos falados em blocos curtos (2 a 6 palavras) com seus respectivos tempos de início (start) e término (end) em segundos (com duas casas decimais).
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

      const segments: AudioTimestampSegment[] = (parsed.segments || [])
        .map((seg: any) => ({
          start: typeof seg.start === 'number' ? Number(seg.start.toFixed(2)) : 0.0,
          end: typeof seg.end === 'number' ? Number(seg.end.toFixed(2)) : 2.0,
          text: String(seg.text || '').trim(),
        }))
        .filter((seg: AudioTimestampSegment) => seg.text.length > 0);

      return {
        fullText: parsed.fullText || segments.map((s) => s.text).join(' '),
        language: parsed.language || params.language || 'pt-BR',
        segments,
      };
    } catch (err: any) {
      this.logger.error(`Erro na chamada da API Gemini GenAI: ${err.message}`);
      throw new InternalServerErrorException(
        `Falha ao processar transcrição no Google Gemini: ${err.message}`,
      );
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
      this.logger.error(`Chamada de síntese Gemini falhou: ${err.message}`);
      throw new InternalServerErrorException(
        `Falha ao sintetizar áudio no Google Gemini: ${err.message}`,
      );
    }
  }
}
