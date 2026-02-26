import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { VideoEncoderService } from './video-encoder.service';
import { VideoEncoderProcessor } from './video-encoder.processor';

@Module({
  imports: [
    AuthModule,
    StorageModule,
    BullModule.registerQueue({
      name: 'video-encoding',
    }),
  ],
  controllers: [VideosController],
  providers: [VideosService, VideoEncoderService, VideoEncoderProcessor],
  exports: [VideosService],
})
export class VideosModule {}
