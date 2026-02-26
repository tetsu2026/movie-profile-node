import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, cleanupDatabase, extractCookies } from './helpers/test-app';

describe('Videos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookies: string;
  let videoId: number;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    // テストユーザーを登録
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: '動画テスト',
        email: 'video-e2e@example.com',
        password: 'password123',
        passwordConfirmation: 'password123',
      });

    cookies = extractCookies(res);
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await app.close();
  });

  describe('POST /api/videos', () => {
    it('動画をアップロードできる', async () => {
      // 最小限のテスト用バイナリ
      const testBuffer = Buffer.alloc(1024, 0);

      const res = await request(app.getHttpServer())
        .post('/api/videos')
        .set('Cookie', cookies)
        .attach('video', testBuffer, {
          filename: 'test.mp4',
          contentType: 'video/mp4',
        })
        .expect(202);

      expect(res.body).toHaveProperty('id');
      expect(res.body.originalFilename).toBe('test.mp4');
      expect(res.body.status).toBe('encoding');

      videoId = res.body.id;
    });

    it('未対応フォーマットは400', async () => {
      const testBuffer = Buffer.alloc(100, 0);

      await request(app.getHttpServer())
        .post('/api/videos')
        .set('Cookie', cookies)
        .attach('video', testBuffer, {
          filename: 'test.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });

    it('ファイルなしは400', async () => {
      await request(app.getHttpServer())
        .post('/api/videos')
        .set('Cookie', cookies)
        .expect(400);
    });

    it('未認証だと401', async () => {
      const testBuffer = Buffer.alloc(100, 0);

      await request(app.getHttpServer())
        .post('/api/videos')
        .attach('video', testBuffer, {
          filename: 'test.mp4',
          contentType: 'video/mp4',
        })
        .expect(401);
    });
  });

  describe('GET /api/videos', () => {
    it('動画一覧を取得できる', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/videos')
        .set('Cookie', cookies)
        .expect(200);

      expect(res.body).toHaveProperty('videos');
      expect(Array.isArray(res.body.videos)).toBe(true);
      expect(res.body.videos.length).toBeGreaterThanOrEqual(1);
    });

    it('未認証だと401', async () => {
      await request(app.getHttpServer())
        .get('/api/videos')
        .expect(401);
    });
  });

  describe('GET /api/videos/:id/status', () => {
    it('動画のステータスを取得できる', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/videos/${videoId}/status`)
        .set('Cookie', cookies)
        .expect(200);

      expect(res.body.id).toBe(videoId);
      expect(res.body).toHaveProperty('status');
    });

    it('存在しない動画IDは404', async () => {
      await request(app.getHttpServer())
        .get('/api/videos/99999/status')
        .set('Cookie', cookies)
        .expect(404);
    });
  });

  describe('DELETE /api/videos/:id', () => {
    it('動画を削除できる', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/videos/${videoId}`)
        .set('Cookie', cookies)
        .expect(200);

      expect(res.body.message).toContain('削除');
    });

    it('削除済み動画のステータス取得は404', async () => {
      await request(app.getHttpServer())
        .get(`/api/videos/${videoId}/status`)
        .set('Cookie', cookies)
        .expect(404);
    });

    it('存在しない動画IDの削除は404', async () => {
      await request(app.getHttpServer())
        .delete('/api/videos/99999')
        .set('Cookie', cookies)
        .expect(404);
    });
  });
});
