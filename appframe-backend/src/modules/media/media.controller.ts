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
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as fs from 'fs';
import { MediaService } from './media.service';
import { CreateVideoJobDto } from './dto/request/create-video-job.dto';
import { DownloadBatchDto } from './dto/request/download-batch.dto';
import { VideoJobResponseDto } from './dto/response/video-job-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('media')
@UseInterceptors(ClassSerializerInterceptor)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('youtube-cookies')
  @UseGuards(JwtAuthGuard)
  async getYouTubeCookiesStatus(): Promise<{
    configured: boolean;
    path: string | null;
    updatedAt: string | null;
  }> {
    return this.mediaService.getYouTubeCookiesStatus();
  }

  @Post('youtube-cookies')
  @UseGuards(JwtAuthGuard)
  async saveYouTubeCookies(
    @Body() body: { cookies?: any; content?: any },
  ): Promise<{ success: boolean; message: string }> {
    const rawCookies = body?.cookies !== undefined ? body.cookies : body?.content;
    return this.mediaService.saveYouTubeCookies(rawCookies);
  }

  @Delete('youtube-cookies')
  @UseGuards(JwtAuthGuard)
  async deleteYouTubeCookies(): Promise<{ success: boolean; message: string }> {
    return this.mediaService.deleteYouTubeCookies();
  }

  @Post('preview')
  @UseGuards(JwtAuthGuard)
  async preparePreview(
    @Body() body: { source_url: string },
  ): Promise<{
    previewId: string;
    streamUrl: string;
    durationSeconds: number;
    width: number;
    height: number;
  }> {
    return this.mediaService.prepareStudioPreview(body?.source_url);
  }

  @Get('preview/:previewId/stream')
  async streamPreview(
    @Param('previewId') previewId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const filePath = this.mediaService.getPreviewFilePath(previewId);
    const stat = fs.statSync(filePath);
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
    @Res() res: Response,
  ): Promise<void> {
    const { filePath, fileName } = await this.mediaService.getCompletedJobFile(
      id,
      userId,
    );
    const stat = fs.statSync(filePath);

    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
    });
    fs.createReadStream(filePath).pipe(res);
  }

  @Get('jobs')
  @UseGuards(JwtAuthGuard)
  async listJobsDirect(
    @CurrentUser('userId') userId: string,
  ): Promise<VideoJobResponseDto[]> {
    return this.mediaService.listUserJobs(userId);
  }

  @Get('jobs/:id')
  @UseGuards(JwtAuthGuard)
  async getJobByIdDirect(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<VideoJobResponseDto> {
    return this.mediaService.getJobById(id, userId);
  }

  @Delete('jobs/:id')
  @UseGuards(JwtAuthGuard)
  async deleteJobDirect(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<{ success: boolean }> {
    return this.mediaService.deleteJob(id, userId);
  }

  @Delete('preview/:previewId')
  @UseGuards(JwtAuthGuard)
  async deletePreview(
    @Param('previewId') previewId: string,
  ): Promise<{ success: boolean }> {
    return this.mediaService.deleteStudioPreview(previewId);
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

  @Post('users/:userId/jobs')
  async createJob(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: CreateVideoJobDto,
  ): Promise<VideoJobResponseDto> {
    return this.mediaService.createJob(userId, dto);
  }

  @Get('users/:userId/jobs')
  async listUserJobs(
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<VideoJobResponseDto[]> {
    return this.mediaService.listUserJobs(userId);
  }

  @Get('users/:userId/jobs/:id')
  async getJobById(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<VideoJobResponseDto> {
    return this.mediaService.getJobById(id, userId);
  }
}
