import {
  Controller,
  Get,
  Param,
  Res,
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

    try {
      const fileBuffer = await this.storageService.download(key);

      // Content-Typeを拡張子から推定
      const contentType = key.endsWith('.mp4')
        ? 'video/mp4'
        : 'application/octet-stream';

      res.set({
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
      });

      res.send(fileBuffer);
    } catch (error) {
      this.logger.warn(`ファイル取得失敗: ${key}`, error);
      throw new NotFoundException('ファイルが見つかりません');
    }
  }
}
