import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
