import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * テスト用のNestJSアプリケーションを作成
 * .env.test から環境変数を読み込み、Docker環境のDB/Redis/MinIOに接続
 */
export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
      AppModule,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  const prisma = app.get(PrismaService);

  return { app, prisma };
}

/**
 * テストデータをクリーンアップ
 * 外部キー制約を考慮した削除順序
 */
export async function cleanupDatabase(prisma: PrismaService) {
  await prisma.video.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * レスポンスからCookieを抽出
 */
export function extractCookies(
  res: { headers: { 'set-cookie'?: string[] } },
): string {
  const cookies = res.headers['set-cookie'];
  if (!cookies) return '';
  return cookies.map((c: string) => c.split(';')[0]).join('; ');
}
