import {
  Controller,
  Get,
  Delete,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { WatermarksService } from './watermarks.service';
import { WatermarkResponseDto } from './dto/response/watermark-response.dto';

@Controller('watermarks')
@UseInterceptors(ClassSerializerInterceptor)
export class WatermarksController {
  constructor(private readonly watermarksService: WatermarksService) {}

  @Get('user/:userId')
  async listByUser(
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<WatermarkResponseDto[]> {
    return this.watermarksService.findByUser(userId);
  }

  @Get(':id/user/:userId')
  async getById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<WatermarkResponseDto> {
    return this.watermarksService.findById(id, userId);
  }

  @Delete(':id/user/:userId')
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<{ deleted: boolean }> {
    const deleted = await this.watermarksService.delete(id, userId);
    return { deleted };
  }
}
