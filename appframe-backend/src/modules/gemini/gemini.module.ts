import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeminiService } from './gemini.service';
import { GeminiController } from './gemini.controller';
import { SharedModule } from '../../shared/shared.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [ConfigModule, SharedModule, TypeOrmModule.forFeature([User])],
  controllers: [GeminiController],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
