import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as Ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

@Injectable()
export class VideoEncoderService {
  private readonly logger = new Logger(VideoEncoderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * 動画をエンコード（1回の試行）
   */
  async encode(videoId: number, userId: number, originalPath: string): Promise<boolean> {
    const tmpDir = os.tmpdir();
    const extension = path.extname(originalPath);
    const tmpInputPath = path.join(tmpDir, `video_${videoId}_input${extension}`);
    const tmpOutputPath = path.join(tmpDir, `video_${videoId}_output.mp4`);

    try {
      // S3から元動画をダウンロード
      const fileBuffer = await this.storageService.download(originalPath);
      fs.writeFileSync(tmpInputPath, fileBuffer);

      // FFmpegでエンコード
      await this.runFfmpeg(tmpInputPath, tmpOutputPath);

      // エンコード済み動画をS3にアップロード
      const encodedPath = `users/${userId}/encoded/${videoId}.mp4`;
      const outputBuffer = fs.readFileSync(tmpOutputPath);
      await this.storageService.upload(encodedPath, outputBuffer, 'video/mp4');

      // 動画情報を更新
      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          encodedPath,
          status: 'completed',
          errorMessage: null,
        },
      });

      // 元動画をS3から削除
      try {
        await this.storageService.delete(originalPath);
        await this.prisma.video.update({
          where: { id: videoId },
          data: { originalPath: null },
        });
      } catch (error) {
        this.logger.warn(`元動画の削除に失敗: ${originalPath}`, error);
      }

      this.logger.log(`動画エンコード成功: ${videoId}`);
      return true;
    } finally {
      // 一時ファイル削除
      if (fs.existsSync(tmpInputPath)) fs.unlinkSync(tmpInputPath);
      if (fs.existsSync(tmpOutputPath)) fs.unlinkSync(tmpOutputPath);
    }
  }

  /**
   * FFmpegでエンコード処理を実行
   */
  private runFfmpeg(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      Ffmpeg(inputPath)
        .outputOptions([
          '-c:v libx264',
          '-c:a aac',
          '-vf scale=-2:min(ih\\,1080)',
          '-preset medium',
          '-crf 23',
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(new Error(`FFmpegエラー: ${err.message}`)))
        .run();
    });
  }

  /**
   * エンコード失敗時のステータス更新
   */
  async markFailed(videoId: number, errorMessage: string): Promise<void> {
    await this.prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'failed',
        errorMessage,
      },
    });
  }
}
