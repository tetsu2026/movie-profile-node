import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ダッシュボード情報を取得
   */
  async getDashboard(userId: number) {
    // プロフィール情報
    const profile = await this.prisma.profile.findFirst({
      where: { deletedAt: null, userId },
      include: {
        thumbnailVideo: true,
        popupVideo: true,
      },
    });

    // 動画ステータス集計
    const videos = await this.prisma.video.findMany({
      where: { deletedAt: null, userId },
    });

    const statusCounts: Record<string, number> = {
      uploading: 0,
      encoding: 0,
      completed: 0,
      failed: 0,
    };

    for (const video of videos) {
      statusCounts[video.status] = (statusCounts[video.status] || 0) + 1;
    }

    return {
      profile,
      videoStats: {
        total: videos.length,
        ...statusCounts,
      },
    };
  }
}
