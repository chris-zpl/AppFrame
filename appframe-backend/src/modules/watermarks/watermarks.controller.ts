import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { WatermarksService } from './watermarks.service';
import { WatermarkResponseDto } from './dto/response/watermark-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

const PNG_MAGIC_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

@Controller('watermarks')
@UseInterceptors(ClassSerializerInterceptor)
export class WatermarksController {
  constructor(private readonly watermarksService: WatermarksService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async listMine(
    @CurrentUser('userId') userId: string,
  ): Promise<WatermarkResponseDto[]> {
    return this.watermarksService.findByUser(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async upload(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<WatermarkResponseDto> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }
    if (
      file.mimetype !== 'image/png' ||
      !file.originalname.toLowerCase().endsWith('.png')
    ) {
      throw new BadRequestException(
        'Apenas arquivos PNG com canal alfa transparente são suportados.',
      );
    }
    if (
      !file.buffer ||
      file.buffer.length < 8 ||
      !file.buffer.subarray(0, 8).equals(PNG_MAGIC_BYTES)
    ) {
      throw new BadRequestException(
        'O arquivo enviado não possui assinatura binária PNG válida.',
      );
    }
    return this.watermarksService.upload(userId, file);
  }

  @Get(':id/file')
  async serveFile(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    const filePath = await this.watermarksService.getFilePath(id);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    return res.sendFile(filePath);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getByIdDirect(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<WatermarkResponseDto> {
    return this.watermarksService.findById(id, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteDirect(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<{ deleted: boolean }> {
    const deleted = await this.watermarksService.delete(id, userId);
    return { deleted };
  }
}
