import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, cleanupDatabase, extractCookies } from './helpers/test-app';

describe('Admin (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookies: string;
  let userCookies: string;
  let targetUserId: number;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    // 管理者ユーザーを登録 → DBで直接roleを変更
    const adminRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: '管理者',
        email: 'admin-e2e@example.com',
        password: 'password123',
        passwordConfirmation: 'password123',
      });

    const adminId = adminRes.body.id;
    await prisma.user.update({
      where: { id: adminId },
      data: { role: 'admin' },
    });

    // 再ログインしてadminロールをJWTに反映
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin-e2e@example.com', password: 'password123' });
    adminCookies = extractCookies(loginRes);

    // 一般ユーザーを登録
    const userRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: '一般ユーザー',
        email: 'user-e2e@example.com',
        password: 'password123',
        passwordConfirmation: 'password123',
      });

    userCookies = extractCookies(userRes);
    targetUserId = userRes.body.id;
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await app.close();
  });

  describe('GET /api/admin/users', () => {
    it('管理者はユーザー一覧を取得できる', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body).toHaveProperty('users');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.users.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination).toHaveProperty('totalPages');
    });

    it('一般ユーザーは403', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Cookie', userCookies)
        .expect(403);
    });

    it('未認証は401', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/users')
        .expect(401);
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('管理者はユーザー詳細を取得できる', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/users/${targetUserId}`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('profile');
      expect(res.body).toHaveProperty('videos');
      expect(res.body.user.id).toBe(targetUserId);
    });

    it('存在しないユーザーIDは404', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/users/99999')
        .set('Cookie', adminCookies)
        .expect(404);
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    it('管理者はユーザー情報を更新できる', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/admin/users/${targetUserId}`)
        .set('Cookie', adminCookies)
        .send({
          name: '更新された名前',
          role: 'user',
        })
        .expect(200);

      expect(res.body.message).toContain('更新');
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('管理者はユーザーを削除できる', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/admin/users/${targetUserId}`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body.message).toContain('削除');
    });

    it('削除済みユーザーの詳細取得は404', async () => {
      await request(app.getHttpServer())
        .get(`/api/admin/users/${targetUserId}`)
        .set('Cookie', adminCookies)
        .expect(404);
    });
  });
});
