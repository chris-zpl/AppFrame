import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import * as fs from 'fs';
import * as path from 'path';
import { BadRequestException } from '@nestjs/common';

import { StorageCleanupService } from '../src/modules/media/services/storage-cleanup.service';
import { VideoJob } from '../src/modules/media/entities/video-job.entity';
import { VideoJobStatus } from '../src/modules/media/enums/video-job-status.enum';
import { MediaService } from '../src/modules/media/media.service';
import { STORAGE_CLEANUP_QUEUE } from '../src/core/queue/queue.constants';

describe('StorageCleanupService & Expiration (Option A)', () => {
  let service: StorageCleanupService;
  let mockJobRepo: any;
  let mockQueue: any;
  let mockMediaService: any;

  const testStorageDir = path.resolve(process.cwd(), 'storage/temp/test-cleanup');
  const testPreviewsDir = path.resolve(process.cwd(), 'storage/temp/previews');
  const testTtsDir = path.resolve(process.cwd(), 'storage/temp/tts');
  const testFinalDir = path.resolve(process.cwd(), 'storage/final');
  const testDownloadsDir = path.resolve(process.cwd(), 'storage/temp/downloads');

  beforeAll(() => {
    fs.mkdirSync(testPreviewsDir, { recursive: true });
    fs.mkdirSync(testTtsDir, { recursive: true });
    fs.mkdirSync(testFinalDir, { recursive: true });
    fs.mkdirSync(testDownloadsDir, { recursive: true });
  });

  beforeEach(async () => {
    mockJobRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'repeatable-cleanup-job' }),
      upsertJobScheduler: jest.fn().mockResolvedValue({ id: 'scheduler-job' }),
    };

    mockMediaService = {
      evictPreviewCache: jest.fn(),
      getCompletedJobFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageCleanupService,
        {
          provide: getRepositoryToken(VideoJob),
          useValue: mockJobRepo,
        },
        {
          provide: getQueueToken(STORAGE_CLEANUP_QUEUE),
          useValue: mockQueue,
        },
        {
          provide: MediaService,
          useValue: mockMediaService,
        },
      ],
    }).compile();

    service = module.get<StorageCleanupService>(StorageCleanupService);
  });

  afterEach(() => {
    service?.onApplicationShutdown();
    jest.clearAllMocks();
  });

  it('deve registrar job repetível no BullMQ ao inicializar bootstrap', async () => {
    await service.onApplicationBootstrap();

    expect(mockQueue.upsertJobScheduler).toHaveBeenCalledWith(
      'storage-cleanup-periodic',
      { pattern: '*/15 * * * *' },
      expect.objectContaining({ name: 'storage-cleanup-job' }),
    );

    service.onApplicationShutdown();
  });

  it('deve expurgar arquivos de preview com mais de 1 hora e evictar cache', async () => {
    const oldPreviewFile = path.join(testPreviewsDir, 'oldpreview12345678901234.mp4');
    const freshPreviewFile = path.join(testPreviewsDir, 'freshpreview1234567890123.mp4');

    fs.writeFileSync(oldPreviewFile, 'fake-mp4-data');
    fs.writeFileSync(freshPreviewFile, 'fake-mp4-data');

    // Altera mtime do oldPreviewFile para 2 horas atrás (> 1h TTL)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    fs.utimesSync(oldPreviewFile, twoHoursAgo, twoHoursAgo);

    const summary = await service.runCleanup('test-spec');

    expect(summary.cleanedPreviews).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(oldPreviewFile)).toBe(false);
    expect(fs.existsSync(freshPreviewFile)).toBe(true);
    expect(mockMediaService.evictPreviewCache).toHaveBeenCalledWith('oldpreview12345678901234');

    // Limpeza
    if (fs.existsSync(freshPreviewFile)) fs.unlinkSync(freshPreviewFile);
  });

  it('deve expurgar áudios TTS do Gemini com mais de 24 horas', async () => {
    const oldTtsFile = path.join(testTtsDir, 'narration_old_test.wav');
    const freshTtsFile = path.join(testTtsDir, 'narration_fresh_test.wav');

    fs.writeFileSync(oldTtsFile, 'fake-tts-wav');
    fs.writeFileSync(freshTtsFile, 'fake-tts-wav');

    // Altera mtime do oldTtsFile para 26 horas atrás (> 24h TTL)
    const twentySixHoursAgo = new Date(Date.now() - 26 * 60 * 60 * 1000);
    fs.utimesSync(oldTtsFile, twentySixHoursAgo, twentySixHoursAgo);

    const summary = await service.runCleanup('test-spec');

    expect(summary.cleanedTts).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(oldTtsFile)).toBe(false);
    expect(fs.existsSync(freshTtsFile)).toBe(true);

    if (fs.existsSync(freshTtsFile)) fs.unlinkSync(freshTtsFile);
  });

  it('deve expurgar arquivos finais com mais de 24 horas e atualizar VideoJob para EXPIRED', async () => {
    const jobId = 'a0000000-0000-4000-8000-000000000001';
    const oldFinalVideo = path.join(testFinalDir, `${jobId}.mp4`);

    fs.writeFileSync(oldFinalVideo, 'fake-rendered-mp4');

    // 25 horas atrás
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    fs.utimesSync(oldFinalVideo, twentyFiveHoursAgo, twentyFiveHoursAgo);

    const summary = await service.runCleanup('test-spec');

    expect(summary.cleanedFinalVideos).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(oldFinalVideo)).toBe(false);
    expect(mockJobRepo.update).toHaveBeenCalledWith(jobId, {
      status: VideoJobStatus.EXPIRED,
      final_video_path: null,
    });
  });

  it('deve auditar jobs COMPLETED no banco criados/finalizados há mais de 24 horas e marcá-los como EXPIRED', async () => {
    const staleJob = {
      id: 'b0000000-0000-4000-8000-000000000002',
      status: VideoJobStatus.COMPLETED,
      final_video_path: 'storage/final/b0000000-0000-4000-8000-000000000002.mp4',
      updated_at: new Date(Date.now() - 30 * 60 * 60 * 1000),
    };

    mockJobRepo.find.mockResolvedValueOnce([staleJob]);

    const summary = await service.runCleanup('test-spec');

    expect(summary.expiredJobsUpdated).toBeGreaterThanOrEqual(1);
    expect(mockJobRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: staleJob.id,
        status: VideoJobStatus.EXPIRED,
        final_video_path: null,
      }),
    );
  });

  it('deve rejeitar downloads de vídeos que foram marcados como EXPIRED', async () => {
    const realMediaService = new MediaService(
      mockJobRepo,
      mockQueue,
      {} as any,
      {} as any,
      {} as any,
    );

    mockJobRepo.findOne.mockResolvedValueOnce({
      id: 'c0000000-0000-4000-8000-000000000003',
      user_id: 'user-1',
      status: VideoJobStatus.EXPIRED,
      final_video_path: null,
    });

    await expect(
      realMediaService.getCompletedJobFile('c0000000-0000-4000-8000-000000000003', 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });
});
