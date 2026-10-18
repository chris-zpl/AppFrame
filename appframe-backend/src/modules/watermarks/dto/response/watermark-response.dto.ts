import { Exclude, Expose, plainToInstance } from 'class-transformer';
import { Watermark } from '../../entities/watermark.entity';

@Exclude()
export class WatermarkResponseDto {
  @Expose()
  id: string;

  @Expose()
  user_id: string;

  @Expose()
  original_name: string;

  @Exclude()
  storage_path: string;

  @Expose()
  mime_type: string;

  @Expose()
  file_size: number;

  @Expose()
  created_at: Date;

  @Expose()
  get url(): string {
    return `/api/v1/watermarks/${this.id}/file`;
  }

  static fromEntity(
    watermark: Watermark | null | undefined,
  ): WatermarkResponseDto | null {
    if (!watermark) return null;
    return plainToInstance(WatermarkResponseDto, watermark, {
      excludeExtraneousValues: true,
    });
  }

  static fromEntities(watermarks: Watermark[]): WatermarkResponseDto[] {
    if (!watermarks) return [];
    return watermarks.map((w) => WatermarkResponseDto.fromEntity(w));
  }
}
