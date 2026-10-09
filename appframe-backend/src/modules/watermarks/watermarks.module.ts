import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Watermark } from './entities/watermark.entity';
import { WatermarksService } from './watermarks.service';
import { WatermarksController } from './watermarks.controller';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([Watermark]), SharedModule],
  controllers: [WatermarksController],
  providers: [WatermarksService],
  exports: [WatermarksService, TypeOrmModule],
})
export class WatermarksModule {}
