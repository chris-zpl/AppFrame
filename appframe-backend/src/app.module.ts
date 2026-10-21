import { Module, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

// Core
import { CoreModule } from './core/core.module';
import { envValidationSchema } from './core/config/env.schema';
import { AllExceptionsFilter } from './core/filters/all-exceptions.filter';
import { TransformResponseInterceptor } from './core/interceptors/transform-response.interceptor';

// Shared
import { SharedModule } from './shared/shared.module';

// Modules
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { MediaModule } from './modules/media/media.module';
import { WatermarksModule } from './modules/watermarks/watermarks.module';
import { ScraperModule } from './modules/scraper/scraper.module';
import { GeminiModule } from './modules/gemini/gemini.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    CoreModule,
    SharedModule,
    UsersModule,
    AuthModule,
    MediaModule,
    WatermarksModule,
    ScraperModule,
    GeminiModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
  ],
})
export class AppModule {}
