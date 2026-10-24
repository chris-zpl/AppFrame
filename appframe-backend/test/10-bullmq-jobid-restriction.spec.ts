import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { MediaService } from '../src/modules/media/media.service';
import { DownloadProcessor } from '../src/modules/media/processors/download.processor';
import { StudioPreviewProcessor } from '../src/modules/media/processors/studio-preview.processor';
import { VideoJob } from '../src/modules/media/entities/video-job.entity';
import { VideoJobStatus } from '../src/modules/media/enums/video-job-status.enum';
import {
  MEDIA_DOWNLOAD_QUEUE,
  STUDIO_PREVIEW_QUEUE,
  MEDIA_RENDER_QUEUE,
} from '../src/core/queue/queue.constants';
import { DownloadService } from '../src/modules/media/services/download.service';
import { FFmpegService } from '../src/modules/media/services/ffmpeg.service';

describe('BullMQ Custom JobId Restriction & Studio Preview Stress Audit', () => {
  let mediaService: MediaService;
  let downloadProcessor: DownloadProcessor;
  let studioPreviewProcessor: StudioPreviewProcessor;

  let mockDownloadQueue: any;
  let mockPreviewQueue: any;
  let mockRenderQueue: any;
  let mockJobRepo: any;
  let mockDownloadService: any;
  let mockFFmpegService: any;

  beforeEach(async () => {
    mockDownloadQueue = {
      add: jest.fn().mockResolvedValue({ id: 'dl-job-1' }),
    };

    mockPreviewQueue = {
      add: jest.fn().mockResolvedValue({ id: 'preview-job-1' }),
    };

    mockRenderQueue = {
      add: jest.fn().mockResolvedValue({ id: 'render-job-1' }),
    };

    mockJobRepo = {
      create: jest.fn().mockImplementation((dto) => ({
        id: '11111111-2222-3333-4444-555555555555',
        source_url: 'https://youtube.com/watch?v=test12345',
        status: VideoJobStatus.PENDING,
        progress: 0,
        ...dto,
      })),
      save: jest.fn().mockImplementation((entity) =>
        Promise.resolve({
          id: '11111111-2222-3333-4444-555555555555',
          source_url: 'https://youtube.com/watch?v=test12345',
          status: VideoJobStatus.PENDING,
          progress: 0,
          ...entity,
        }),
      ),
      findOne: jest.fn().mockResolvedValue({
        id: '11111111-2222-3333-4444-555555555555',
        aspect_ratio: '9:16',
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const cancelledSet = new Set<string>();
    mockDownloadService = {
      getPreviewId: jest.fn().mockReturnValue('dQw4w9WgXcQ_1234567890'),
      getPreviewFilePath: jest.fn().mockImplementation((id: string) => `/tmp/${id}.mp4`),
      fileExists: jest.fn().mockResolvedValue(false),
      downloadMedia: jest.fn().mockResolvedValue('/tmp/video.mp4'),
      ensurePreviewDownloaded: jest.fn().mockImplementation(async (url: string) => {
        const id = mockDownloadService.getPreviewId(url);
        if (cancelledSet.has(id)) {
          throw new Error('PREVIEW_CANCELLED');
        }
        return { previewId: id, filePath: `/tmp/${id}.mp4` };
      }),
      cancelPreviewDownload: jest.fn().mockImplementation((id: string) => {
        cancelledSet.add(id);
      }),
      clearCancelledPreview: jest.fn().mockImplementation((id: string) => {
        cancelledSet.delete(id);
      }),
      isPreviewCancelled: jest.fn().mockImplementation((id: string) => cancelledSet.has(id)),
    };

    mockFFmpegService = {
      probeMetadata: jest.fn().mockResolvedValue({
        durationSeconds: 120.5,
        width: 1920,
        height: 1080,
      }),
      extractAudioWaveform: jest.fn().mockResolvedValue([0.2, 0.5, 0.8, 0.4]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        DownloadProcessor,
        StudioPreviewProcessor,
        {
          provide: getRepositoryToken(VideoJob),
          useValue: mockJobRepo,
        },
        {
          provide: getQueueToken(MEDIA_DOWNLOAD_QUEUE),
          useValue: mockDownloadQueue,
        },
        {
          provide: getQueueToken(STUDIO_PREVIEW_QUEUE),
          useValue: mockPreviewQueue,
        },
        {
          provide: getQueueToken(MEDIA_RENDER_QUEUE),
          useValue: mockRenderQueue,
        },
        {
          provide: DownloadService,
          useValue: mockDownloadService,
        },
        {
          provide: FFmpegService,
          useValue: mockFFmpegService,
        },
      ],
    }).compile();

    mediaService = module.get<MediaService>(MediaService);
    downloadProcessor = module.get<DownloadProcessor>(DownloadProcessor);
    studioPreviewProcessor = module.get<StudioPreviewProcessor>(StudioPreviewProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('1. prepareStudioPreview NÃO deve conter dois-pontos (:) no jobId do BullMQ', async () => {
    const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const userId = 'user-uuid-123';

    await mediaService.prepareStudioPreview(videoUrl, userId);

    expect(mockPreviewQueue.add).toHaveBeenCalledTimes(1);
    const [jobName, payload, options] = mockPreviewQueue.add.mock.calls[0];

    expect(jobName).toBe('prepare-preview');
    expect(payload.sourceUrl).toBe(videoUrl);
    expect(options.jobId).toBeDefined();

    // Validação estrita: BullMQ proíbe ':' em custom IDs
    expect(options.jobId).not.toContain(':');
    expect(options.jobId).toMatch(/^preview-[a-zA-Z0-9_-]+$/);
  });

  it('2. createJob NÃO deve conter dois-pontos (:) no jobId do BullMQ', async () => {
    const userId = 'user-uuid-123';
    const dto: any = {
      source_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      aspect_ratio: '9:16',
    };

    await mediaService.createJob(userId, dto);

    expect(mockDownloadQueue.add).toHaveBeenCalledTimes(1);
    const [jobName, payload, options] = mockDownloadQueue.add.mock.calls[0];

    expect(jobName).toBe('download-video');
    expect(payload.jobId).toBe('11111111-2222-3333-4444-555555555555');
    expect(options.jobId).toBeDefined();

    // Validação estrita: BullMQ proíbe ':' em custom IDs
    expect(options.jobId).not.toContain(':');
    expect(options.jobId).toBe('download-11111111-2222-3333-4444-555555555555');
  });

  it('3. DownloadProcessor NÃO deve conter dois-pontos (:) no jobId de renderização', async () => {
    const mockJob: any = {
      data: {
        jobId: '11111111-2222-3333-4444-555555555555',
        userId: 'user-uuid-123',
        sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
      updateProgress: jest.fn().mockResolvedValue(true),
    };

    await downloadProcessor.process(mockJob);

    expect(mockRenderQueue.add).toHaveBeenCalledTimes(1);
    const [jobName, payload, options] = mockRenderQueue.add.mock.calls[0];

    expect(jobName).toBe('render-video');
    expect(payload.jobId).toBe('11111111-2222-3333-4444-555555555555');
    expect(options.jobId).toBeDefined();

    // Validação estrita: BullMQ proíbe ':' em custom IDs
    expect(options.jobId).not.toContain(':');
    expect(options.jobId).toBe('render-11111111-2222-3333-4444-555555555555');
  });

  it('4. prepareStudioPreview deve usar removeOnComplete: true e recuperar de estado PROCESSING órfão quando o job BullMQ já finalizou', async () => {
    const videoUrl1 = 'https://www.youtube.com/watch?v=video1';
    const videoUrl2 = 'https://www.youtube.com/watch?v=video2';
    mockDownloadService.getPreviewId
      .mockReturnValueOnce('111111111111111111111111')
      .mockReturnValueOnce('222222222222222222222222')
      .mockReturnValueOnce('222222222222222222222222');

    // Primeiro preview
    await mediaService.prepareStudioPreview(videoUrl1, 'user-1');
    expect(mockPreviewQueue.add).toHaveBeenCalledTimes(1);
    expect(mockPreviewQueue.add.mock.calls[0][2]).toEqual({
      jobId: 'preview-111111111111111111111111',
      removeOnComplete: true,
      removeOnFail: true,
    });

    // Segundo preview consecutivo
    await mediaService.prepareStudioPreview(videoUrl2, 'user-1');
    expect(mockPreviewQueue.add).toHaveBeenCalledTimes(2);
    expect(mockPreviewQueue.add.mock.calls[1][2]).toEqual({
      jobId: 'preview-222222222222222222222222',
      removeOnComplete: true,
      removeOnFail: true,
    });

    // Simula job no BullMQ já finalizado ('completed'), mas cache ainda em PROCESSING: deve remover job antigo e reenfileirar
    const mockStaleJob = {
      getState: jest.fn().mockResolvedValue('completed'),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    mockPreviewQueue.getJob = jest.fn().mockResolvedValue(mockStaleJob);

    await mediaService.prepareStudioPreview(videoUrl2, 'user-1');
    expect(mockStaleJob.remove).toHaveBeenCalled();
    expect(mockPreviewQueue.add).toHaveBeenCalledTimes(3);
  });

  it('5. Teste de Estresse (3 vídeos): Carrega Vídeo 1 até COMPLETED, alterna rápido para Vídeo 2 e imediatamente para Vídeo 3 sem esperar o 2º terminar', async () => {
    const userId = 'stress-user-99';
    const url1 = 'https://www.youtube.com/watch?v=vid11111111';
    const url2 = 'https://www.youtube.com/watch?v=vid22222222';
    const url3 = 'https://www.youtube.com/watch?v=vid33333333';

    const id1 = '111111111111111111111111';
    const id2 = '222222222222222222222222';
    const id3 = '333333333333333333333333';

    // Ainda não existem arquivos em disco inicialmente
    mockDownloadService.fileExists.mockResolvedValue(false);
    mockDownloadService.getPreviewId.mockImplementation((url: string) => {
      if (url.includes('vid1')) return id1;
      if (url.includes('vid2')) return id2;
      return id3;
    });

    const jobsInRedis = new Map<string, any>();
    mockPreviewQueue.getJob = jest.fn().mockImplementation(async (jobId: string) => {
      return jobsInRedis.get(jobId) || null;
    });
    mockPreviewQueue.add = jest.fn().mockImplementation(async (name, data, opts) => {
      const jobObj = {
        id: opts.jobId,
        name,
        data,
        opts,
        updateProgress: jest.fn().mockResolvedValue(undefined),
        getState: jest.fn().mockResolvedValue('waiting'),
        remove: jest.fn().mockImplementation(async () => {
          jobsInRedis.delete(opts.jobId);
        }),
      };
      jobsInRedis.set(opts.jobId, jobObj);
      return jobObj;
    });

    // PASSO 1: Abre o Vídeo 1 no Studio e deixa carregar até o player iniciar (COMPLETED)
    const state1Init = await mediaService.prepareStudioPreview(url1, userId);
    expect(state1Init.status).toBe('PROCESSING');
    expect(jobsInRedis.has(`preview-${id1}`)).toBe(true);

    // Worker processa o Vídeo 1 até concluir
    const job1 = jobsInRedis.get(`preview-${id1}`);
    const res1 = await studioPreviewProcessor.process(job1);
    jobsInRedis.delete(`preview-${id1}`); // removeOnComplete: true
    expect(res1.status).toBe('COMPLETED');
    expect(res1.durationSeconds).toBe(120.5);

    const status1After = await mediaService.getPreviewStatus(id1);
    expect(status1After.status).toBe('COMPLETED');
    expect(status1After.waveformPeaks).toEqual([0.2, 0.5, 0.8, 0.4]);

    // PASSO 2: Alterna para o Vídeo 2 (entra em PROCESSING na fila)
    const state2Init = await mediaService.prepareStudioPreview(url2, userId);
    expect(state2Init.status).toBe('PROCESSING');
    expect(jobsInRedis.has(`preview-${id2}`)).toBe(true);
    const job2 = jobsInRedis.get(`preview-${id2}`);

    // PASSO 3: Alterna IMEDIATAMENTE para o Vídeo 3 sem esperar o Vídeo 2 terminar!
    const state3Init = await mediaService.prepareStudioPreview(url3, userId);
    expect(state3Init.status).toBe('PROCESSING');

    // Verifica que o job órfão do Vídeo 2 foi cancelado e removido da fila do Redis
    expect(mockDownloadService.cancelPreviewDownload).toHaveBeenCalledWith(id2);
    expect(job2.remove).toHaveBeenCalled();
    expect(jobsInRedis.has(`preview-${id2}`)).toBe(false);

    // Caso o worker já tivesse capturado o job2 milissegundos antes, o processador aborta limpo sem travar
    const orphanResult = await studioPreviewProcessor.process(job2);
    expect(orphanResult.status).toBe('CANCELLED');

    // O estado órfão do Vídeo 2 foi limpo do cache/Redis (não ficou preso em PROCESSING)
    const orphanState = await mediaService.getPreviewState(id2);
    expect(orphanState).toBeNull();

    // PASSO 4: Worker processa o Vídeo 3 imediatamente e conclui com sucesso
    expect(jobsInRedis.has(`preview-${id3}`)).toBe(true);
    const job3 = jobsInRedis.get(`preview-${id3}`);
    const res3 = await studioPreviewProcessor.process(job3);
    jobsInRedis.delete(`preview-${id3}`);

    expect(res3.status).toBe('COMPLETED');
    const status3Final = await mediaService.getPreviewStatus(id3);
    expect(status3Final.status).toBe('COMPLETED');
    expect(status3Final.streamUrl).toBe(`/api/v1/media/preview/${id3}/stream`);
    expect(status3Final.durationSeconds).toBe(120.5);

    // PASSO 5: Se o usuário decidir voltar para o Vídeo 2 depois, ele NÃO trava e carrega normalmente
    const state2Retry = await mediaService.prepareStudioPreview(url2, userId);
    expect(state2Retry.status).toBe('PROCESSING');
    expect(mockDownloadService.clearCancelledPreview).toHaveBeenCalledWith(id2);
    const job2Retry = jobsInRedis.get(`preview-${id2}`);
    const res2Final = await studioPreviewProcessor.process(job2Retry);
    expect(res2Final.status).toBe('COMPLETED');
  });
});
