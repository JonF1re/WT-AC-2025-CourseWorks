/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Posts E2E', () => {
  let app: INestApplication<App>;
  let accessToken: string;
  let postId: string;
  const testUser = {
    username: `postuser_${Date.now()}`,
    email: `postuser_${Date.now()}@example.com`,
    password: 'password123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // Register and login
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser);
    accessToken = registerRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/posts (POST)', () => {
    it('should create a new post', () => {
      return request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: 'This is my first test post!' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.text).toBe('This is my first test post!');
          postId = res.body.id;
        });
    });

    it('should fail without auth', () => {
      return request(app.getHttpServer())
        .post('/api/posts')
        .send({ text: 'This should fail' })
        .expect(401);
    });

    it('should fail with empty text', () => {
      return request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: '' })
        .expect(400);
    });

    it('should fail with too long text (>280 chars)', () => {
      const longText = 'a'.repeat(281);
      return request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: longText })
        .expect(400);
    });
  });

  describe('/api/posts/:id (GET)', () => {
    it('should get post by id', () => {
      return request(app.getHttpServer())
        .get(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(postId);
          expect(res.body.text).toBe('This is my first test post!');
          expect(res.body).toHaveProperty('author');
          expect(res.body.author.username).toBe(testUser.username);
        });
    });

    it('should fail with non-existent post', () => {
      return request(app.getHttpServer())
        .get('/api/posts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('/api/posts (GET)', () => {
    it('should get list of posts', () => {
      return request(app.getHttpServer())
        .get('/api/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('items');
          expect(Array.isArray(res.body.items)).toBe(true);
          expect(res.body.items.length).toBeGreaterThan(0);
          expect(res.body).toHaveProperty('nextCursor');
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get('/api/posts?limit=5&cursor=0')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.items.length).toBeLessThanOrEqual(5);
        });
    });
  });

  describe('/api/posts/:id (PATCH)', () => {
    it('should update own post', () => {
      return request(app.getHttpServer())
        .patch(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ text: 'Updated post text' })
        .expect(200)
        .expect((res) => {
          expect(res.body.text).toBe('Updated post text');
        });
    });

    it('should fail without auth', () => {
      return request(app.getHttpServer())
        .patch(`/api/posts/${postId}`)
        .send({ text: 'This should fail' })
        .expect(401);
    });
  });

  describe('/api/posts/:id (DELETE)', () => {
    it('should fail to delete without auth', () => {
      return request(app.getHttpServer()).delete(`/api/posts/${postId}`).expect(401);
    });

    it('should delete own post', () => {
      return request(app.getHttpServer())
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should fail to get deleted post', () => {
      return request(app.getHttpServer())
        .get(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
