import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ヘルスチェックエンドポイント
   *
   * DB接続を確認し、アプリケーションの稼働状態を返す
   */
  @Get()
  async check() {
    // DB接続確認
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
