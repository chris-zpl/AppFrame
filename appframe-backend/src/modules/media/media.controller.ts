import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
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
