import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { CreateVideoJobDto } from './dto/request/create-video-job.dto';
import { VideoJobResponseDto } from './dto/response/video-job-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('jobs')
@UseInterceptors(ClassSerializerInterceptor)
export class JobsController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async listJobs(
    @CurrentUser('userId') userId: string,
  ): Promise<VideoJobResponseDto[]> {
    return this.mediaService.listUserJobs(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getJobById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<VideoJobResponseDto> {
    return this.mediaService.getJobById(id, userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createJob(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateVideoJobDto,
  ): Promise<VideoJobResponseDto> {
    return this.mediaService.createJob(userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteJob(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<{ success: boolean }> {
    return this.mediaService.deleteJob(id, userId);
  }
}
