import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import { Watermark } from './entities/watermark.entity';
import { WatermarkResponseDto } from './dto/response/watermark-response.dto';
import { StorageService } from '../../shared/storage/storage.service';

@Injectable()
export class WatermarksService {
  constructor(
    @InjectRepository(Watermark)
    private readonly watermarkRepository: Repository<Watermark>,
    private readonly storageService: StorageService,
  ) {}

  async findByUser(userId: string): Promise<WatermarkResponseDto[]> {
    const list = await this.watermarkRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
    return WatermarkResponseDto.fromEntities(list);
  }

  async findById(id: string, userId: string): Promise<WatermarkResponseDto> {
    const watermark = await this.watermarkRepository.findOne({
      where: { id, user_id: userId },
    });
    if (!watermark) {
      throw new NotFoundException('Marca d’água não encontrada.');
    }
    return WatermarkResponseDto.fromEntity(watermark)!;
  }

  async create(data: {
    userId: string;
    originalName: string;
    storagePath: string;
    mimeType: string;
    fileSize: number;
  }): Promise<WatermarkResponseDto> {
    const item = this.watermarkRepository.create({
      user_id: data.userId,
      original_name: data.originalName,
      storage_path: data.storagePath,
      mime_type: data.mimeType,
      file_size: data.fileSize,
    });
    const saved = await this.watermarkRepository.save(item);
    return WatermarkResponseDto.fromEntity(saved)!;
  }

  async upload(userId: string, file: Express.Multer.File): Promise<WatermarkResponseDto> {
    const cleanName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${Date.now()}-${cleanName}`;
    const storagePath = await this.storageService.saveFile('watermarks', fileName, file.buffer);
    return this.create({
      userId,
      originalName: file.originalname,
      storagePath,
      mimeType: file.mimetype,
      fileSize: file.size,
    });
  }

  async getFilePath(id: string, userId?: string): Promise<string> {
    const watermark = await this.watermarkRepository.findOne({
      where: userId ? { id, user_id: userId } : { id },
    });
    if (!watermark) {
      throw new NotFoundException('Marca d’água não encontrada.');
    }
    return path.isAbsolute(watermark.storage_path)
      ? watermark.storage_path
      : path.resolve(process.cwd(), watermark.storage_path);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const watermark = await this.watermarkRepository.findOne({
      where: { id, user_id: userId },
    });
    if (!watermark) {
      throw new NotFoundException('Marca d’água não encontrada.');
    }
    await this.storageService.deleteFile(watermark.storage_path);
    await this.watermarkRepository.remove(watermark);
    return true;
  }
}
