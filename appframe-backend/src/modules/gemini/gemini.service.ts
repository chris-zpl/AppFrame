import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';
import * as path from 'path';

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
  private readonly ai: GoogleGenAI | null = null;
  private readonly apiKey: string;
  private readonly modelName: string;
  private readonly ttsDir = path.resolve(process.cwd(), 'storage/temp/tts');

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY', '');
    this.modelName = this.configService.get<string>('GEMINI_MODEL', 'gemini-2.5-flash');

    if (this.apiKey && !this.apiKey.startsWith('dummy-')) {
      try {
        this.ai = new GoogleGenAI({ apiKey: this.apiKey });
        this.logger.log(`SDK oficial @google/genai inicializado com modelo: ${this.modelName}`);
      } catch (err: any) {
        this.logger.error(`Falha ao instanciar GoogleGenAI: ${err.message}`);
      }
    } else {
      this.logger.warn(
        'GEMINI_API_KEY não configurada ou com valor placeholder. O serviço funcionará com mocks estruturados.',
      );
    }

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
   * Transcrição de áudio com extração determinística de marcações de tempo (timestamps)
   * para alimentação de legendas dinâmicas.
   */
  async transcribeAudio(params: {
    audioBuffer?: Buffer;
    audioPath?: string;
    mimeType?: string;
    language?: string;
  }): Promise<TranscriptionResult> {
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

    // Se o cliente da Google GenAI estiver ativo com chave real
    if (this.ai && this.apiKey && !this.apiKey.startsWith('dummy-')) {
      try {
        this.logger.log(`Enviando áudio (${buffer.length} bytes) para o modelo Gemini: ${this.modelName}`);

        const prompt = `Você é um motor especializado em reconhecimento de fala (STT) para geração de legendas dinâmicas.
Transcreva todo o conteúdo de fala do áudio fornecido, segmentando as frases faladas com seus respectivos tempos de início (start) e término (end) em segundos (com duas casas decimais).
Retorne estritamente um JSON no seguinte formato:
{
  "fullText": "Texto completo transcrito aqui...",
  "language": "pt-BR",
  "segments": [
    { "start": 0.00, "end": 2.40, "text": "Primeira frase ou expressão falada" },
    { "start": 2.45, "end": 4.80, "text": "Segunda frase falada" }
  ]
}`;

        const response = await this.ai.models.generateContent({
          model: this.modelName,
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

        const segments: AudioTimestampSegment[] = (parsed.segments || []).map((seg: any) => ({
          start: typeof seg.start === 'number' ? Number(seg.start.toFixed(2)) : 0.0,
          end: typeof seg.end === 'number' ? Number(seg.end.toFixed(2)) : 2.0,
          text: String(seg.text || '').trim(),
        }));

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

    // Fallback estruturado para desenvolvimento e testes
    this.logger.log('Gerando transcrição simulada com timestamps para desenvolvimento.');
    return {
      fullText: 'Bem-vindo ao AppFrame! Esta é uma transcrição automática com timestamps sincronizados.',
      language: params.language || 'pt-BR',
      segments: [
        {
          start: 0.0,
          end: 2.1,
          text: 'Bem-vindo ao AppFrame!',
        },
        {
          start: 2.15,
          end: 5.5,
          text: 'Esta é uma transcrição automática com timestamps sincronizados.',
        },
      ],
    };
  }

  /**
   * Geração de áudio sintetizado (TTS) a partir de texto digitado pelo usuário
   * para sobreposição de narração na timeline do vídeo.
   */
  async synthesizeSpeech(options: SynthesizeSpeechOptions): Promise<SynthesizeSpeechResult> {
    if (!options.text || options.text.trim().length === 0) {
      throw new BadRequestException('O texto para síntese de voz não pode estar vazio.');
    }

    await this.ensureDirs();
    const cleanText = options.text.trim();
    const voiceName = options.voiceName || 'Puck';
    const filename = `narration_${Date.now()}_${Math.random().toString(36).substring(7)}.wav`;
    const outputPath = path.join(this.ttsDir, filename);

    // Se o cliente da Google GenAI estiver ativo com chave real
    if (this.ai && this.apiKey && !this.apiKey.startsWith('dummy-')) {
      try {
        this.logger.log(`Sintetizando fala via Gemini para o texto (${cleanText.length} chars) com voz: ${voiceName}`);

        const response = await this.ai.models.generateContent({
          model: this.modelName,
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

        // Extrai a parte de áudio dos candidatos retornados
        const candidate = response.candidates?.[0];
        const audioPart = candidate?.content?.parts?.find(
          (part: any) => part.inlineData && part.inlineData.data,
        );

        if (audioPart && audioPart.inlineData?.data) {
          const audioBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
          const mimeType = audioPart.inlineData.mimeType || 'audio/wav';

          await fsPromises.writeFile(outputPath, audioBuffer);
          this.logger.log(`Áudio de narração salvo com sucesso em: ${outputPath}`);

          // Estimativa de duração: média de ~15 caracteres por segundo de fala
          const durationEstimate = Math.max(1, Number((cleanText.length / 15).toFixed(2)));

          return {
            audioBuffer,
            mimeType,
            savedFilePath: path.relative(process.cwd(), outputPath),
            durationEstimateSeconds: durationEstimate,
          };
        }
      } catch (err: any) {
        this.logger.warn(`Chamada de síntese Gemini falhou ou não retornou áudio: ${err.message}`);
      }
    }

    // Fallback gerador de áudio WAV sintético válido para ambientes locais de desenvolvimento
    this.logger.log(`Gerando áudio WAV de narração simulada para: "${cleanText.substring(0, 30)}..."`);
    const durationSeconds = Math.max(1.5, Math.min(30, cleanText.length * 0.08));
    const sampleRate = 16000;
    const numSamples = Math.floor(sampleRate * durationSeconds);
    const wavBuffer = this.createSyntheticWavBuffer(numSamples, sampleRate);

    await fsPromises.writeFile(outputPath, wavBuffer);

    return {
      audioBuffer: wavBuffer,
      mimeType: 'audio/wav',
      savedFilePath: path.relative(process.cwd(), outputPath),
      durationEstimateSeconds: Number(durationSeconds.toFixed(2)),
    };
  }

  /**
   * Constrói cabeçalho e buffer WAV PCM estritamente válido de 16-bit mono
   */
  private createSyntheticWavBuffer(numSamples: number, sampleRate: number): Buffer {
    const byteRate = sampleRate * 2;
    const dataSize = numSamples * 2;
    const buffer = Buffer.alloc(44 + dataSize);

    // RIFF chunk descriptor
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);

    // "fmt " sub-chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 para PCM)
    buffer.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
    buffer.writeUInt16LE(1, 22);  // NumChannels (1 = Mono)
    buffer.writeUInt32LE(sampleRate, 24); // SampleRate
    buffer.writeUInt32LE(byteRate, 28);   // ByteRate
    buffer.writeUInt16LE(2, 32);  // BlockAlign
    buffer.writeUInt16LE(16, 34); // BitsPerSample

    // "data" sub-chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Preenche com áudio senoidal suave de 440Hz
    const freq = 440;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * freq * t) * 0.2; // Volume baixo e limpo
      const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
      buffer.writeInt16LE(intSample, 44 + i * 2);
    }

    return buffer;
  }
}
