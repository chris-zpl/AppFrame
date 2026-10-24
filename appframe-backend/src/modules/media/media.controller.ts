import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import { MediaService, StudioPreviewState } from './media.service';
import { CreateVideoJobDto } from './dto/request/create-video-job.dto';
import { DownloadBatchDto } from './dto/request/download-batch.dto';
import { PreparePreviewDto } from './dto/request/prepare-preview.dto';
import { VideoJobResponseDto } from './dto/response/video-job-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('media')
@UseInterceptors(ClassSerializerInterceptor)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('preview')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAuthGuard)
  async preparePreview(
    @Body() dto: PreparePreviewDto,
    @CurrentUser('userId') userId: string,
  ): Promise<StudioPreviewState> {
    return this.mediaService.prepareStudioPreview(dto.source_url, userId);
  }

  @Get('preview/:previewId/status')
  @UseGuards(JwtAuthGuard)
  async getPreviewStatus(
    @Param('previewId') previewId: string,
  ): Promise<StudioPreviewState> {
    return this.mediaService.getPreviewStatus(previewId);
  }

  @Get('preview/:previewId')
  @UseGuards(JwtAuthGuard)
  async getPreviewDirect(
    @Param('previewId') previewId: string,
  ): Promise<StudioPreviewState> {
    return this.mediaService.getPreviewStatus(previewId);
  }

  @Get('preview/:previewId/stream')
  async streamPreview(
    @Param('previewId') previewId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const filePath = this.mediaService.getPreviewFilePath(previewId);
    let stat: fs.Stats;
    try {
      stat = await fsPromises.stat(filePath);
    } catch (err: any) {
      if (err?.code === 'ENOENT') {
        throw new NotFoundException('Arquivo de preview do vídeo não encontrado.');
      }
      throw err;
    }
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start) || start >= fileSize || (parts[1] && end < start)) {
        res
          .status(416)
          .set({
            'Content-Range': `bytes */${fileSize}`,
            'Accept-Ranges': 'bytes',
          })
          .end();
        return;
      }

      const chunkSize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.status(206).set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': 'video/mp4',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });

      req.on('close', () => {
        file.destroy();
      });

      file.pipe(res);
    } else {
      res.status(200).set({
        'Content-Length': fileSize.toString(),
        'Accept-Ranges': 'bytes',
        'Content-Type': 'video/mp4',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });
      const file = fs.createReadStream(filePath);
      req.on('close', () => {
        file.destroy();
      });
      file.pipe(res);
    }
  }

  @Get('jobs/:id/download')
  @UseGuards(JwtAuthGuard)
  async downloadCompletedJob(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const { filePath, fileName } = await this.mediaService.getCompletedJobFile(
      id,
      userId,
    );
    const stat = await fsPromises.stat(filePath);

    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
    });

    const fileStream = fs.createReadStream(filePath);
    req.on('close', () => fileStream.destroy());
    fileStream.pipe(res);
  }

  @Delete('previews')
  @UseGuards(JwtAuthGuard)
  async clearPreviews(
    @Body('previewIds') previewIds?: string[],
  ): Promise<{ success: boolean; cleared: number }> {
    if (!Array.isArray(previewIds) || previewIds.length === 0) {
      throw new BadRequestException(
        'Informe os identificadores de preview a serem removidos.',
      );
    }
    return this.mediaService.clearPreviews(previewIds);
  }

  @Delete('preview/:previewId')
  @UseGuards(JwtAuthGuard)
  async deletePreview(
    @Param('previewId') previewId: string,
  ): Promise<{ success: boolean }> {
    return this.mediaService.deleteStudioPreview(previewId);
  }

  @Post('users/:userId/jobs')
  @UseGuards(JwtAuthGuard)
  async createJobForUser(
    @Param('userId', new ParseUUIDPipe()) targetUserId: string,
    @CurrentUser('userId') currentUserId: string,
    @Body() dto: CreateVideoJobDto,
  ): Promise<VideoJobResponseDto> {
    if (targetUserId !== currentUserId) {
      throw new ForbiddenException('Acesso negado: você não pode criar jobs para outro usuário.');
    }
    return this.mediaService.createJob(currentUserId, dto);
  }

  @Get('users/:userId/jobs')
  @UseGuards(JwtAuthGuard)
  async listJobsForUser(
    @Param('userId', new ParseUUIDPipe()) targetUserId: string,
    @CurrentUser('userId') currentUserId: string,
  ): Promise<VideoJobResponseDto[]> {
    if (targetUserId !== currentUserId) {
      throw new ForbiddenException('Acesso negado: você não pode listar jobs de outro usuário.');
    }
    return this.mediaService.listUserJobs(currentUserId);
  }

  @Get('users/:userId/jobs/:id')
  @UseGuards(JwtAuthGuard)
  async getJobForUser(
    @Param('userId', new ParseUUIDPipe()) targetUserId: string,
    @Param('id', new ParseUUIDPipe()) jobId: string,
    @CurrentUser('userId') currentUserId: string,
  ): Promise<VideoJobResponseDto> {
    if (targetUserId !== currentUserId) {
      throw new ForbiddenException('Acesso negado: você não pode acessar jobs de outro usuário.');
    }
    return this.mediaService.getJobById(jobId, currentUserId);
  }

  @Get('jobs/:id')
  @UseGuards(JwtAuthGuard)
  async getJobByIdDirect(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<VideoJobResponseDto> {
    return this.mediaService.getJobById(id, userId);
  }

  @Post('jobs')
  @UseGuards(JwtAuthGuard)
  async createJobDirect(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateVideoJobDto,
  ): Promise<VideoJobResponseDto> {
    return this.mediaService.createJob(userId, dto);
  }

  @Post('render')
  @UseGuards(JwtAuthGuard)
  async renderJob(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateVideoJobDto,
  ): Promise<VideoJobResponseDto> {
    return this.mediaService.createJob(userId, dto);
  }

  @Post('download-batch')
  @UseGuards(JwtAuthGuard)
  async downloadBatch(
    @CurrentUser('userId') userId: string,
    @Body() dto: DownloadBatchDto,
  ): Promise<VideoJobResponseDto[]> {
    return this.mediaService.createDownloadBatch(userId, dto);
  }
}
