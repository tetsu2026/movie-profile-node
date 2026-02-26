import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, cleanupDatabase, extractCookies } from './helpers/test-app';

describe('Profiles (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookies: string;
  let userId: number;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    // テストユーザーを登録
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'プロフィールテスト',
        email: 'profile-test@example.com',
        password: 'password123',
        passwordConfirmation: 'password123',
      });

    cookies = extractCookies(res);
    userId = res.body.id;
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await app.close();
  });

  describe('GET /api/profiles/me', () => {
    it('自分のプロフィールを取得できる', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/profiles/me')
        .set('Cookie', cookies)
        .expect(200);

      expect(res.body.userId).toBe(userId);
      expect(res.body.name).toBe('プロフィールテスト');
      expect(res.body.isPublic).toBe(true);
    });

    it('未認証だと401', async () => {
      await request(app.getHttpServer())
        .get('/api/profiles/me')
        .expect(401);
    });
  });

  describe('PUT /api/profiles/me', () => {
    it('プロフィールを更新できる', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/profiles/me')
        .set('Cookie', cookies)
        .send({
          name: '更新後の名前',
          biography: '自己紹介テスト',
        })
        .expect(200);

      expect(res.body.name).toBe('更新後の名前');
      expect(res.body.biography).toBe('自己紹介テスト');
    });

    it('テーマカラーを更新できる', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/profiles/me')
        .set('Cookie', cookies)
        .send({
          name: '更新後の名前',
          themeColor: '#ff5500',
        })
        .expect(200);

      expect(res.body.themeColor).toBe('#ff5500');
    });

    it('不正なテーマカラー形式は400', async () => {
      await request(app.getHttpServer())
        .put('/api/profiles/me')
        .set('Cookie', cookies)
        .send({
          name: 'テスト',
          themeColor: 'invalid',
        })
        .expect(400);
    });

    it('名前が50文字を超えると400', async () => {
      await request(app.getHttpServer())
        .put('/api/profiles/me')
        .set('Cookie', cookies)
        .send({
          name: 'あ'.repeat(51),
        })
        .expect(400);
    });
  });

  describe('GET /api/users/:id/profile', () => {
    it('公開プロフィールを取得できる（認証不要）', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/users/${userId}/profile`)
        .expect(200);

      expect(res.body.userId).toBe(userId);
      expect(res.body.isPublic).toBe(true);
    });

    it('存在しないユーザーIDは404', async () => {
      await request(app.getHttpServer())
        .get('/api/users/99999/profile')
        .expect(404);
    });
  });
});
