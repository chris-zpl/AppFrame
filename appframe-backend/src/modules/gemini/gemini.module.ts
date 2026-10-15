import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeminiService } from './gemini.service';
import { GeminiController } from './gemini.controller';
import { SharedModule } from '../../shared/shared.module';
import { User } from '../users/entities/user.entity';
import { SystemSetting } from '../admin/entities/system-setting.entity';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    TypeOrmModule.forFeature([User, SystemSetting]),
    forwardRef(() => MediaModule),
  ],
  controllers: [GeminiController],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
