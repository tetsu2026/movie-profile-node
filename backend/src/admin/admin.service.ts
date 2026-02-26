import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * ユーザー一覧を取得（ページネーション付き）
   */
  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { profile: true },
      }),
      this.prisma.user.count(),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        profile: u.profile,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * ユーザー詳細を取得（編集用）
   */
  async findOne(userId: number) {
    const user = await this.prisma.user.findFirst({
      where: { deletedAt: null, id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('ユーザーが見つかりません');
    }

    const videos = await this.prisma.video.findMany({
      where: { deletedAt: null, userId, status: 'completed' },
      orderBy: { createdAt: 'desc' },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      profile: user.profile,
      videos,
    };
  }

  /**
   * ユーザー情報を更新
   */
  async update(userId: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { deletedAt: null, id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('ユーザーが見つかりません');
    }

    // トランザクションで User + Profile を更新
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { role: dto.role },
      }),
      this.prisma.profile.update({
        where: { userId },
        data: {
          name: dto.name,
          biography: dto.biography,
          thumbnailVideoId: dto.thumbnailVideoId,
        },
      }),
    ]);

    return { message: 'ユーザー情報を更新しました' };
  }

  /**
   * ユーザーを削除（S3クリーンアップ含む）
   */
  async delete(userId: number) {
    const user = await this.prisma.user.findFirst({
      where: { deletedAt: null, id: userId },
    });

    if (!user) {
      throw new NotFoundException('ユーザーが見つかりません');
    }

    // 動画のS3ファイルを削除
    const videos = await this.prisma.video.findMany({
      where: { deletedAt: null, userId },
    });

    for (const video of videos) {
      if (video.encodedPath) {
        try {
          await this.storageService.delete(video.encodedPath);
        } catch (error) {
          this.logger.warn(`S3ファイル削除失敗: ${video.encodedPath}`, error);
        }
      }
      if (video.originalPath) {
        try {
          await this.storageService.delete(video.originalPath);
        } catch (error) {
          this.logger.warn(`S3ファイル削除失敗: ${video.originalPath}`, error);
        }
      }
    }

    // ソフトデリート
    await this.prisma.user.delete({ where: { id: userId } });
    this.logger.log(`ユーザー削除: ${userId}`);

    return { message: 'ユーザーを削除しました' };
  }
}
