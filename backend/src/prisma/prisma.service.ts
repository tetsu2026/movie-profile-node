import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * ソフトデリートの deletedAt: null フィルタは各サービスのクエリに
 * 明示的に追加すること（Prisma v6では$useミドルウェアが廃止済み）
 *
 * 削除時は prisma.user.update({ data: { deletedAt: new Date() } }) を使用
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
