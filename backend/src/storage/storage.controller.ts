import {
  Controller,
  Get,
  Param,
  Res,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { StorageService } from './storage.service';

/**
 * S3(MinIO)に保存された動画ファイルをストリーミング配信するコントローラ
 */
@Controller('storage')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  /**
   * S3キーに対応するファイルを取得して配信
   */
  @Get('*path')
  async serve(
    @Param('path') pathSegments: string[],
    @Res() res: Response,
  ) {
    const key = pathSegments.join('/');

    if (!key) {
      throw new NotFoundException('ファイルパスが指定されていません');
    }

    // パストラバーサル防止
    if (key.includes('..') || key.startsWith('/')) {
      throw new BadRequestException('不正なファイルパスです');
    }

    // エンコード済み動画のみ配信を許可
    const allowedPattern = /^users\/\d+\/encoded\/\d+\.mp4$/;
    if (!allowedPattern.test(key)) {
      throw new NotFoundException('ファイルが見つかりません');
    }

    try {
      const { stream, contentLength } = await this.storageService.downloadStream(key);

      // Content-Typeを拡張子から推定
      const contentType = key.endsWith('.mp4')
        ? 'video/mp4'
        : 'application/octet-stream';

      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        ...(contentLength && { 'Content-Length': contentLength.toString() }),
      });

      // ストリームエラー時のハンドリング
      stream.on('error', (err) => {
        this.logger.warn(`ストリーミングエラー: ${key}`, err);
        if (!res.headersSent) {
          res.status(404).json({ message: 'ファイルが見つかりません' });
        } else {
          res.destroy();
        }
      });

      stream.pipe(res);
    } catch (error) {
      this.logger.warn(`ファイル取得失敗: ${key}`, error);
      throw new NotFoundException('ファイルが見つかりません');
    }
  }
}
