import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { CreateVideoJobDto } from './dto/request/create-video-job.dto';
import { VideoJobResponseDto } from './dto/response/video-job-response.dto';

@Controller('media')
@UseInterceptors(ClassSerializerInterceptor)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

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
