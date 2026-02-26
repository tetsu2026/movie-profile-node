import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, cleanupDatabase, extractCookies } from './helpers/test-app';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await app.close();
  });

  const testUser = {
    name: 'テスト太郎',
    email: 'auth-test@example.com',
    password: 'password123',
    passwordConfirmation: 'password123',
  };

  let cookies: string;

  describe('POST /api/auth/register', () => {
    it('ユーザー登録に成功する', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe(testUser.name);
      expect(res.body.email).toBe(testUser.email);
      expect(res.body.role).toBe('user');
      expect(res.headers['set-cookie']).toBeDefined();

      cookies = extractCookies(res);
    });

    it('同じメールアドレスで登録するとエラー', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('バリデーションエラー（パスワード短すぎ）', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...testUser, email: 'new@example.com', password: '123', passwordConfirmation: '123' })
        .expect(400);
    });

    it('バリデーションエラー（メール形式不正）', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...testUser, email: 'invalid-email' })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('ログインに成功する', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(res.body.email).toBe(testUser.email);
      expect(res.headers['set-cookie']).toBeDefined();

      cookies = extractCookies(res);
    });

    it('パスワードが間違っていると401', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);
    });

    it('存在しないメールアドレスで401', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('認証済みユーザーの情報を取得できる', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookies)
        .expect(200);

      expect(res.body.email).toBe(testUser.email);
      expect(res.body.name).toBe(testUser.name);
      expect(res.body).not.toHaveProperty('password');
    });

    it('未認証だと401', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });
  });

  describe('PUT /api/auth/password', () => {
    it('パスワードを更新できる', async () => {
      await request(app.getHttpServer())
        .put('/api/auth/password')
        .set('Cookie', cookies)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123',
        })
        .expect(200);

      // 新しいパスワードでログインできることを確認
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'newpassword123' })
        .expect(200);

      cookies = extractCookies(res);
    });

    it('現在のパスワードが間違っていると401', async () => {
      await request(app.getHttpServer())
        .put('/api/auth/password')
        .set('Cookie', cookies)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'anotherpassword12',
        })
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('トークンをリフレッシュできる', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(200);

      expect(res.body.message).toBe('トークンを更新しました');
      cookies = extractCookies(res);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('ログアウトに成功する', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .expect(200);

      expect(res.body.message).toBe('ログアウトしました');
    });
  });

  describe('DELETE /api/auth/me', () => {
    it('アカウントを削除できる（ソフトデリート）', async () => {
      // 再ログイン
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'newpassword123' })
        .expect(200);
      cookies = extractCookies(loginRes);

      await request(app.getHttpServer())
        .delete('/api/auth/me')
        .set('Cookie', cookies)
        .expect(200);

      // 削除後はログインできない
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'newpassword123' })
        .expect(401);
    });
  });
});
