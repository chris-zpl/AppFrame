import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

import { DownloadService } from '../src/modules/media/services/download.service';
import { MediaService } from '../src/modules/media/media.service';
import { MediaController } from '../src/modules/media/media.controller';
import { FFmpegService } from '../src/modules/media/services/ffmpeg.service';
import { WatermarksService } from '../src/modules/watermarks/watermarks.service';
import { VideoJob } from '../src/modules/media/entities/video-job.entity';
import { MEDIA_DOWNLOAD_QUEUE } from '../src/core/queue/queue.constants';

describe('Logout Cache & Preview Cleanup Audit', () => {
  let downloadService: DownloadService;
  let mediaService: MediaService;
  let mediaController: MediaController;
  let mockJobRepo: any;
  let mockQueue: any;

  const previewsDir = path.resolve(process.cwd(), 'storage/temp/previews');
  const finalDir = path.resolve(process.cwd(), 'storage/final');

  beforeAll(() => {
    fs.mkdirSync(previewsDir, { recursive: true });
    fs.mkdirSync(finalDir, { recursive: true });
  });

  beforeEach(async () => {
    mockJobRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      remove: jest.fn(),
      delete: jest.fn(),
    };

    mockQueue = {
      add: jest.fn(),
    };

    const mockFFmpegService = {
      getVideoMetadata: jest.fn(),
      generateWaveformPeaks: jest.fn().mockResolvedValue([0.1, 0.5, 0.8]),
    };

    const mockWatermarksService = {
      findById: jest.fn(),
    };

    const configServiceMock = {
      get: jest.fn((key: string, def?: any) => {
        if (key === 'YTDLP_PATH') return 'yt-dlp';
        if (key === 'TEMP_DIR') return 'storage/temp';
        return def;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        DownloadService,
        MediaService,
        {
          provide: 'ConfigService',
          useValue: configServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: getRepositoryToken(VideoJob),
          useValue: mockJobRepo,
        },
        {
          provide: getQueueToken(MEDIA_DOWNLOAD_QUEUE),
          useValue: mockQueue,
        },
        {
          provide: FFmpegService,
          useValue: mockFFmpegService,
        },
        {
          provide: WatermarksService,
          useValue: mockWatermarksService,
        },
      ],
    }).compile();

    downloadService = module.get<DownloadService>(DownloadService);
    mediaService = module.get<MediaService>(MediaService);
    mediaController = module.get<MediaController>(MediaController);
  });

  describe('DownloadService.clearAllPreviewFiles', () => {
    it('deve remover todos os arquivos .mp4 e .part da pasta de previews quando nenhum id for especificado', async () => {
      const dummyFile1 = path.join(previewsDir, 'preview_test_11111111111111111111.mp4');
      const dummyFile2 = path.join(previewsDir, 'preview_test_22222222222222222222.part');
      const finalDummyFile = path.join(finalDir, 'history_video_job_keep_intact.mp4');

      fs.writeFileSync(dummyFile1, 'preview data 1');
      fs.writeFileSync(dummyFile2, 'preview part data');
      fs.writeFileSync(finalDummyFile, 'history final video data');

      const cleared = await downloadService.clearAllPreviewFiles();
      expect(cleared).toBeGreaterThanOrEqual(2);

      expect(fs.existsSync(dummyFile1)).toBe(false);
      expect(fs.existsSync(dummyFile2)).toBe(false);

      // Garante que arquivos finais do histórico NÃO são tocados
      expect(fs.existsSync(finalDummyFile)).toBe(true);

      // Limpeza do arquivo de teste de histórico
      if (fs.existsSync(finalDummyFile)) {
        fs.unlinkSync(finalDummyFile);
      }
    });

    it('deve remover apenas previews específicos quando uma lista de ids/urls for fornecida', async () => {
      const idA = 'aaaaaaaaaaaaaaaaaaaaaaaa';
      const idB = 'bbbbbbbbbbbbbbbbbbbbbbbb';
      const fileA = path.join(previewsDir, `${idA}.mp4`);
      const fileB = path.join(previewsDir, `${idB}.mp4`);

      fs.writeFileSync(fileA, 'data A');
      fs.writeFileSync(fileB, 'data B');

      const cleared = await downloadService.clearAllPreviewFiles([idA]);
      expect(cleared).toBe(1);

      expect(fs.existsSync(fileA)).toBe(false);
      expect(fs.existsSync(fileB)).toBe(true);

      // Limpeza
      if (fs.existsSync(fileB)) fs.unlinkSync(fileB);
    });
  });

  describe('MediaService.clearPreviews', () => {
    it('deve limpar o cache em memória e invocar remoção de arquivos temporários', async () => {
      const spyClear = jest.spyOn(downloadService, 'clearAllPreviewFiles').mockResolvedValue(3);

      const result = await mediaService.clearPreviews();

      expect(result).toEqual({ success: true, cleared: 3 });
      expect(spyClear).toHaveBeenCalledWith(undefined);
      // Garante que o repositório de histórico (VideoJob) NUNCA foi chamado para deletar
      expect(mockJobRepo.delete).not.toHaveBeenCalled();
      expect(mockJobRepo.remove).not.toHaveBeenCalled();
    });
  });

  describe('MediaController.clearPreviews', () => {
    it('deve responder à requisição DELETE /media/previews corretamente', async () => {
      jest.spyOn(mediaService, 'clearPreviews').mockResolvedValue({ success: true, cleared: 5 });

      const res = await mediaController.clearPreviews(['some-preview-id']);
      expect(res).toEqual({ success: true, cleared: 5 });
    });
  });
});
