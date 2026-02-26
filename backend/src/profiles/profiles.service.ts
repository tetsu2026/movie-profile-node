import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 認証ユーザーのプロフィールを取得
   */
  async getMyProfile(userId: number) {
    const profile = await this.prisma.profile.findFirst({
      where: { deletedAt: null, userId },
      include: {
        thumbnailVideo: true,
        popupVideo: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('プロフィールが見つかりません');
    }

    return profile;
  }

  /**
   * プロフィールを更新
   */
  async updateMyProfile(userId: number, dto: UpdateProfileDto) {
    // 動画所有権チェック
    if (dto.thumbnailVideoId) {
      await this.validateVideoOwnership(userId, dto.thumbnailVideoId);
    }
    if (dto.popupVideoId) {
      await this.validateVideoOwnership(userId, dto.popupVideoId);
    }

    const profile = await this.prisma.profile.update({
      where: { userId },
      data: {
        name: dto.name,
        biography: dto.biography,
        thumbnailVideoId: dto.thumbnailVideoId,
        popupVideoId: dto.popupVideoId,
        themeColor: dto.themeColor,
      },
      include: {
        thumbnailVideo: true,
        popupVideo: true,
      },
    });

    return profile;
  }

  /**
   * 公開プロフィールを取得
   */
  async getPublicProfile(userId: number) {
    const profile = await this.prisma.profile.findFirst({
      where: { deletedAt: null,
        userId,
        isPublic: true,
      },
      include: {
        thumbnailVideo: true,
        popupVideo: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('プロフィールが見つかりません');
    }

    return profile;
  }

  /**
   * 動画の所有権とエンコード完了状態をチェック
   */
  private async validateVideoOwnership(userId: number, videoId: number) {
    const video = await this.prisma.video.findFirst({
      where: { deletedAt: null, id: videoId },
    });

    if (!video || video.userId !== userId) {
      throw new BadRequestException('選択された動画が無効です');
    }

    if (video.status !== 'completed') {
      throw new BadRequestException('エンコードが完了していない動画は選択できません');
    }
  }
}
