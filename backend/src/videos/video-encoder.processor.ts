import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { VideoEncoderService } from './video-encoder.service';
import { PrismaService } from '../prisma/prisma.service';

interface EncodeJobData {
  videoId: number;
  userId: number;
  originalPath: string;
}

@Processor('video-encoding')
export class VideoEncoderProcessor {
  private readonly logger = new Logger(VideoEncoderProcessor.name);

  constructor(
    private readonly encoderService: VideoEncoderService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('encode')
  async handleEncode(job: Job<EncodeJobData>) {
    const { videoId, userId, originalPath } = job.data;
    this.logger.log(`エンコード処理開始: video=${videoId}, attempt=${job.attemptsMade + 1}`);

    try {
      await this.encoderService.encode(videoId, userId, originalPath);
      this.logger.log(`エンコード処理完了: video=${videoId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`エンコード処理失敗: video=${videoId}, error=${errorMessage}`);

      // リトライ回数を更新
      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          retryCount: { increment: 1 },
          errorMessage,
        },
      });

      // 最終リトライの場合は failed に更新
      if (job.attemptsMade + 1 >= (job.opts?.attempts ?? 3)) {
        await this.encoderService.markFailed(videoId, errorMessage);
      }

      throw error; // BullMQ がリトライを管理
    }
  }
}
