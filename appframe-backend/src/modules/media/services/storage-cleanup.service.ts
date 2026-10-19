import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository, LessThan } from 'typeorm';
import { Queue } from 'bullmq';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';

import { VideoJob } from '../entities/video-job.entity';
import { VideoJobStatus } from '../enums/video-job-status.enum';
import { MediaService } from '../media.service';
import { STORAGE_CLEANUP_QUEUE } from '../../../core/queue/queue.constants';

export interface StorageCleanupSummary {
  cleanedPreviews: number;
  cleanedTts: number;
  cleanedDownloads: number;
  cleanedFinalVideos: number;
  expiredJobsUpdated: number;
  durationMs: number;
  triggeredBy: string;
}

@Injectable()
export class StorageCleanupService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(StorageCleanupService.name);

  // Diretórios monitorados no storage
  private readonly previewsDir = path.resolve(process.cwd(), 'storage/temp/previews');
  private readonly ttsDir = path.resolve(process.cwd(), 'storage/temp/tts');
  private readonly downloadsDir = path.resolve(process.cwd(), 'storage/temp/downloads');
  private readonly finalDir = path.resolve(process.cwd(), 'storage/final');

  // Prazos de retenção (TTL)
  private readonly PREVIEW_TTL_MS = 60 * 60 * 1000; // 1 hora
  private readonly TTS_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
  private readonly DOWNLOADS_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas
  private readonly FINAL_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

  private intervalRef: NodeJS.Timeout | null = null;
  private startupTimeoutRef: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    @InjectRepository(VideoJob)
    private readonly videoJobRepository: Repository<VideoJob>,
    @InjectQueue(STORAGE_CLEANUP_QUEUE)
    private readonly cleanupQueue: Queue,
    @Optional()
    @Inject(forwardRef(() => MediaService))
    private readonly mediaService?: MediaService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // 1. Configura job repetível no BullMQ (execução a cada 15 minutos)
    try {
      if (typeof (this.cleanupQueue as any).upsertJobScheduler === 'function') {
        await (this.cleanupQueue as any).upsertJobScheduler(
          'storage-cleanup-periodic',
          { every: 15 * 60 * 1000 },
          { name: 'storage-cleanup-job', opts: { removeOnComplete: true } },
        );
      } else {
        await (this.cleanupQueue as any).add(
          'storage-cleanup-job',
          {},
          {
            repeat: {
              every: 15 * 60 * 1000,
            },
            jobId: 'storage-cleanup-periodic',
            removeOnComplete: true,
            removeOnFail: 10,
          } as any,
        );
      }
      this.logger.log(
        'Job agendado de limpeza periódica de storage registrado no BullMQ (intervalo: 15min).',
      );
    } catch (err: any) {
      this.logger.warn(
        `Falha ao registrar job agendado no BullMQ (${err.message}). O schedule fallback (setInterval) garantirá a execução.`,
      );
    }

    // 2. Schedule Fallback: setInterval como rede de segurança caso o Redis/BullMQ esteja reiniciando
    this.intervalRef = setInterval(() => {
      this.runCleanupSafe('interval-fallback').catch((err) => {
        this.logger.error(`Erro no fallback de limpeza de storage: ${err.message}`);
      });
    }, 15 * 60 * 1000);

    // 3. Execução inicial suave após 15 segundos da inicialização do servidor
    this.startupTimeoutRef = setTimeout(() => {
      this.runCleanupSafe('bootstrap-startup').catch(() => {});
    }, 15000);
  }

  onApplicationShutdown(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
    if (this.startupTimeoutRef) {
      clearTimeout(this.startupTimeoutRef);
      this.startupTimeoutRef = null;
    }
  }

  /**
   * Executa a limpeza com trava de concorrência para evitar execuções simultâneas
   * entre o BullMQ e o fallback de setInterval.
   */
  async runCleanupSafe(triggeredBy = 'manual'): Promise<StorageCleanupSummary | null> {
    if (this.isRunning) {
      this.logger.debug(
        `Rotina de limpeza de storage já está em andamento. Ignorando disparo de [${triggeredBy}].`,
      );
      return null;
    }

    this.isRunning = true;
    try {
      return await this.runCleanup(triggeredBy);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Rotina central de auditoria e expurgo de arquivos obsoletos:
   * - storage/temp/previews/: arquivos > 1h (evict do cache em memória)
   * - storage/temp/tts/: áudios gerados pelo Gemini > 24h
   * - storage/temp/downloads/: downloads residuais > 2h
   * - storage/final/: vídeos finais > 24h (marcar VideoJob como EXPIRED no PostgreSQL)
   */
  async runCleanup(triggeredBy = 'manual'): Promise<StorageCleanupSummary> {
    const startTime = Date.now();
    this.logger.log(`[StorageCleanup] Iniciando rotina de limpeza disparada por [${triggeredBy}]...`);

    let cleanedPreviews = 0;
    let cleanedTts = 0;
    let cleanedDownloads = 0;
    let cleanedFinalVideos = 0;
    let expiredJobsUpdated = 0;

    // 1. Limpeza de Previews (> 1 hora)
    try {
      cleanedPreviews = await this.cleanDirectoryFiles(
        this.previewsDir,
        this.PREVIEW_TTL_MS,
        (fileName) => {
          const previewId = path.basename(fileName, path.extname(fileName));
          this.mediaService?.evictPreviewCache(previewId);
        },
      );
    } catch (err: any) {
      this.logger.warn(`Erro ao limpar previews: ${err.message}`);
    }

    // 2. Limpeza de Áudios Gemini TTS (> 24 horas)
    try {
      cleanedTts = await this.cleanDirectoryFiles(this.ttsDir, this.TTS_TTL_MS);
    } catch (err: any) {
      this.logger.warn(`Erro ao limpar áudios TTS: ${err.message}`);
    }

    // 3. Limpeza de Downloads temporários residuais (> 2 horas)
    try {
      cleanedDownloads = await this.cleanDirectoryFiles(
        this.downloadsDir,
        this.DOWNLOADS_TTL_MS,
      );
    } catch (err: any) {
      this.logger.warn(`Erro ao limpar downloads temporários: ${err.message}`);
    }

    // 4. Limpeza de Vídeos Finais no Disco (> 24 horas)
    try {
      cleanedFinalVideos = await this.cleanDirectoryFiles(
        this.finalDir,
        this.FINAL_TTL_MS,
        async (fileName) => {
          const jobId = path.basename(fileName, path.extname(fileName));
          if (this.isValidUuid(jobId)) {
            await this.markJobExpired(jobId);
            expiredJobsUpdated++;
          }
        },
      );
    } catch (err: any) {
      this.logger.warn(`Erro ao limpar vídeos finais: ${err.message}`);
    }

    // 5. Auditoria no Banco de Dados: localiza jobs COMPLETED criados/finalizados há mais de 24h
    try {
      const cutoff = new Date(Date.now() - this.FINAL_TTL_MS);
      const staleCompletedJobs = await this.videoJobRepository.find({
        where: {
          status: VideoJobStatus.COMPLETED,
          updated_at: LessThan(cutoff),
        },
      });

      for (const job of staleCompletedJobs) {
        if (job.final_video_path) {
          const resolved = path.isAbsolute(job.final_video_path)
            ? job.final_video_path
            : path.resolve(process.cwd(), job.final_video_path);
          if (fs.existsSync(resolved)) {
            try {
              await fsPromises.unlink(resolved);
              cleanedFinalVideos++;
            } catch {}
          }
        }
        job.status = VideoJobStatus.EXPIRED;
        job.final_video_path = null;
        await this.videoJobRepository.save(job);
        expiredJobsUpdated++;
      }
    } catch (err: any) {
      this.logger.warn(`Erro ao auditar jobs expirados no banco: ${err.message}`);
    }

    const durationMs = Date.now() - startTime;
    const summary: StorageCleanupSummary = {
      cleanedPreviews,
      cleanedTts,
      cleanedDownloads,
      cleanedFinalVideos,
      expiredJobsUpdated,
      durationMs,
      triggeredBy,
    };

    this.logger.log(
      `[StorageCleanup] Concluído em ${durationMs}ms. Previews expurgados: ${cleanedPreviews}, TTS: ${cleanedTts}, Downloads: ${cleanedDownloads}, Finais: ${cleanedFinalVideos}, Jobs expirados: ${expiredJobsUpdated}.`,
    );

    return summary;
  }

  /**
   * Varre um diretório e remove arquivos cuja última modificação exceda o TTL em milissegundos.
   */
  private async cleanDirectoryFiles(
    dirPath: string,
    ttlMs: number,
    onFileDeleted?: (fileName: string) => Promise<void> | void,
  ): Promise<number> {
    if (!fs.existsSync(dirPath)) {
      return 0;
    }

    const files = await fsPromises.readdir(dirPath);
    const now = Date.now();
    let count = 0;

    for (const file of files) {
      // Ignora arquivos ocultos (.gitkeep, etc.)
      if (file.startsWith('.')) continue;

      const fullPath = path.join(dirPath, file);
      try {
        const stat = await fsPromises.stat(fullPath);
        if (stat.isFile()) {
          const ageMs = now - stat.mtimeMs;
          if (ageMs > ttlMs) {
            await fsPromises.unlink(fullPath);
            count++;
            if (onFileDeleted) {
              await Promise.resolve(onFileDeleted(file));
            }
          }
        }
      } catch (fileErr: any) {
        this.logger.debug(`Ignorando arquivo inacessível ${fullPath}: ${fileErr.message}`);
      }
    }

    return count;
  }

  private async markJobExpired(jobId: string): Promise<void> {
    try {
      await this.videoJobRepository.update(jobId, {
        status: VideoJobStatus.EXPIRED,
        final_video_path: null,
      });
    } catch (err: any) {
      this.logger.warn(`Falha ao atualizar job ${jobId} para EXPIRED: ${err.message}`);
    }
  }

  private isValidUuid(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      str,
    );
  }
}
