import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    @InjectQueue('video-encoding') private readonly encodingQueue: Queue,
  ) {}

  /**
   * 動画をアップロードし、エンコードキューに追加
   */
  async upload(userId: number, file: Express.Multer.File) {
    // multer はファイル名を Latin-1 でデコードするため、UTF-8 に変換
    const originalFilename = Buffer.from(file.originalname, 'latin1').toString('utf8');

    // 動画レコード作成
    const video = await this.prisma.video.create({
      data: {
        userId,
        originalFilename,
        status: 'uploading',
        fileSize: BigInt(file.size),
      },
    });

    try {
      // S3にアップロード
      const extension = originalFilename.split('.').pop();
      const originalPath = `users/${userId}/original/${video.id}.${extension}`;
      await this.storageService.upload(originalPath, file.buffer, file.mimetype);

      // ステータスを encoding に更新
      await this.prisma.video.update({
        where: { id: video.id },
        data: {
          originalPath,
          status: 'encoding',
        },
      });

      // BullMQキューにエンコードジョブを追加
      await this.encodingQueue.add('encode', {
        videoId: video.id,
        userId,
        originalPath,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });

      this.logger.log(`エンコードジョブ追加: video=${video.id}`);

      return {
        id: video.id,
        originalFilename: video.originalFilename,
        status: 'encoding',
      };
    } catch (error) {
      // エラー時は動画レコードを削除
      await this.prisma.video.update({
        where: { id: video.id },
        data: { deletedAt: new Date() },
      });
      throw error;
    }
  }

  /**
   * ユーザーの動画一覧を取得
   */
  async findAllByUser(userId: number) {
    const videos = await this.prisma.video.findMany({
      where: { deletedAt: null, userId },
      orderBy: { createdAt: 'desc' },
    });

    // プロフィールで使用中の動画IDを取得
    const profile = await this.prisma.profile.findFirst({
      where: { deletedAt: null, userId },
      select: { thumbnailVideoId: true, popupVideoId: true },
    });

    return {
      videos: videos.map((v) => ({
        ...v,
        fileSize: v.fileSize ? Number(v.fileSize) : null,
        encodedUrl: v.encodedPath
          ? this.storageService.getUrl(v.encodedPath)
          : null,
      })),
      thumbnailVideoId: profile?.thumbnailVideoId ?? null,
      popupVideoId: profile?.popupVideoId ?? null,
    };
  }

  /**
   * 動画のステータスを取得（ポーリング用）
   */
  async getStatus(videoId: number, userId: number) {
    const video = await this.prisma.video.findFirst({
      where: { deletedAt: null, id: videoId },
    });

    if (!video || video.userId !== userId) {
      throw new NotFoundException('動画が見つかりません');
    }

    return {
      id: video.id,
      status: video.status,
      errorMessage: video.errorMessage,
      encodedUrl: video.encodedPath
        ? this.storageService.getUrl(video.encodedPath)
        : null,
    };
  }

  /**
   * 動画を削除
   */
  async delete(videoId: number, userId: number, forceDelete: boolean = false) {
    const video = await this.prisma.video.findFirst({
      where: { deletedAt: null, id: videoId },
    });

    if (!video) {
      throw new NotFoundException('動画が見つかりません');
    }

    if (video.userId !== userId) {
      throw new ForbiddenException('他のユーザーの動画は削除できません');
    }

    // プロフィールでの使用チェック
    const profile = await this.prisma.profile.findFirst({
      where: { deletedAt: null, userId },
    });

    const isThumbnail = profile?.thumbnailVideoId === video.id;
    const isPopup = profile?.popupVideoId === video.id;
    const isUsed = isThumbnail || isPopup;

    if (isUsed && !forceDelete) {
      throw new BadRequestException(
        'この動画はプロフィールで使用中のため削除できません',
      );
    }

    // プロフィールからの参照を解除
    if (isUsed && profile) {
      const updateData: Record<string, null> = {};
      if (isThumbnail) updateData.thumbnailVideoId = null;
      if (isPopup) updateData.popupVideoId = null;

      await this.prisma.profile.update({
        where: { userId },
        data: updateData,
      });
    }

    // S3からファイル削除
    if (video.encodedPath) {
      try {
        await this.storageService.delete(video.encodedPath);
      } catch (error) {
        this.logger.warn(`S3ファイル削除失敗 (encoded): ${video.encodedPath}`, error);
      }
    }
    if (video.originalPath) {
      try {
        await this.storageService.delete(video.originalPath);
      } catch (error) {
        this.logger.warn(`S3ファイル削除失敗 (original): ${video.originalPath}`, error);
      }
    }

    // ソフトデリート
    await this.prisma.video.update({
      where: { id: video.id },
      data: { deletedAt: new Date() },
    });

    // メッセージ生成
    let message = '動画を削除しました';
    if (isThumbnail && isPopup) {
      message = '動画を削除し、プロフィールのサムネイル動画とポップアップ動画の設定を解除しました';
    } else if (isThumbnail) {
      message = '動画を削除し、プロフィールのサムネイル動画の設定を解除しました';
    } else if (isPopup) {
      message = '動画を削除し、プロフィールのポップアップ動画の設定を解除しました';
    }

    return { message };
  }
}
