import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, cleanupDatabase, extractCookies } from './helpers/test-app';

describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookies: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'ダッシュボードテスト',
        email: 'dashboard-test@example.com',
        password: 'password123',
        passwordConfirmation: 'password123',
      });

    cookies = extractCookies(res);
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await app.close();
  });

  describe('GET /api/dashboard', () => {
    it('ダッシュボード情報を取得できる', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard')
        .set('Cookie', cookies)
        .expect(200);

      expect(res.body.data).toHaveProperty('profile');
      expect(res.body.data).toHaveProperty('videoStats');
      expect(res.body.data.videoStats).toHaveProperty('total');
      expect(res.body.data.videoStats.total).toBe(0);
    });

    it('未認証だと401', async () => {
      await request(app.getHttpServer())
        .get('/api/dashboard')
        .expect(401);
    });
  });
});
