import request from 'supertest';
import { app } from '../../../src/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

describe('Users API Integration Tests', () => {
  let adminToken: string;
  let userToken: string;
  let adminId: string;
  let userId: string;
  let testUserId: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({});

    const admin = await prisma.user.create({
      data: {
        username: 'admin_test',
        password_hash: 'adminpass',
        role: 'admin',
      },
    });
    adminId = admin.id;
    adminToken = jwt.sign({ id: admin.id, role: admin.role }, JWT_SECRET);

    const user = await prisma.user.create({
      data: {
        username: 'user_test',
        password_hash: 'userpass',
        role: 'user',
      },
    });
    userId = user.id;
    userToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('GET /users', () => {
    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('should return list of users for admin', async () => {
      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/users?role=user')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((user: any) => {
        expect(user.role).toBe('user');
      });
    });

    it('should filter users by username', async () => {
      const response = await request(app)
        .get('/users?username=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].username).toContain('admin');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/users?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
      expect(response.body.page).toBe(1);
    });
  });

  describe('POST /users', () => {
    it('should create new user (admin only)', async () => {
      const newUser = {
        username: 'newuser_test',
        password: 'newpass',
        role: 'user',
      };

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('ok');
      expect(response.body.data.username).toBe(newUser.username);
      expect(response.body.data.role).toBe(newUser.role);
      
      testUserId = response.body.data.id;
    });

    it('should return 403 when regular user tries to create user', async () => {
      const newUser = {
        username: 'unauthorized_user',
        password: 'pass',
        role: 'user',
      };

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newUser);

      expect(response.status).toBe(403);
    });

    it('should validate user data', async () => {
      const invalidUser = {
        username: '',
        password: '',
      };

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUser);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('should prevent duplicate usernames', async () => {
      const duplicateUser = {
        username: 'admin_test',
        password: 'anotherpass',
        role: 'user',
      };

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateUser);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /users/create-user', () => {
    it('should create user with default "user" role (admin only)', async () => {
      const newUser = {
        username: 'created_user',
        password: 'password123',
      };

      const response = await request(app)
        .post('/users/create-user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('ok');
      expect(response.body.data.role).toBe('user');
      expect(response.body.data.username).toBe(newUser.username);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/users/create-user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 403 for non-admin', async () => {
      const response = await request(app)
        .post('/users/create-user')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ username: 'test', password: 'pass' });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by ID (admin access)', async () => {
      const response = await request(app)
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.username).toBe('user_test');
    });

    it('should allow user to access own profile', async () => {
      const response = await request(app)
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(userId);
    });

    it('should prevent user from accessing other user profiles', async () => {
      const response = await request(app)
        .get(`/users/${adminId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get(`/users/${userId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /users/:id', () => {
    it('should allow admin to update any user', async () => {
      const updateData = {
        username: 'updated_username',
        role: 'user',
      };

      const response = await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.username).toBe(updateData.username);
    });

    it('should allow user to update own profile', async () => {
      const updateData = {
        username: 'user_updated',
      };

      const response = await request(app)
        .put(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.username).toBe(updateData.username);
    });

    it('should prevent user from updating other users', async () => {
      const updateData = {
        username: 'hacked_user',
      };

      const response = await request(app)
        .put(`/users/${adminId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
    });

    it('should validate update data', async () => {
      const invalidData = {
        role: 'invalid_role',
      };

      const response = await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
    });

    it('should handle updating non-existent user', async () => {
      const response = await request(app)
        .put('/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'new' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should allow admin to delete user', async () => {
      const userToDelete = await prisma.user.create({
        data: {
          username: 'todelete',
          password_hash: 'pass',
          role: 'user',
        },
      });

      const response = await request(app)
        .delete(`/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');

      const deletedUser = await prisma.user.findUnique({
        where: { id: userToDelete.id },
      });
      expect(deletedUser).toBeNull();
    });

    it('should prevent regular user from deleting users', async () => {
      const response = await request(app)
        .delete(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .delete('/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('RBAC Compliance Tests', () => {
    it('should enforce admin-only access for user listing', async () => {
      const response1 = await request(app).get('/users');
      expect(response1.status).toBe(401);

      const response2 = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`);
      expect(response2.status).toBe(403);

      const response3 = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response3.status).toBe(200);
    });

    it('should enforce ownership for user updates', async () => {
      const selfUpdate = await request(app)
        .put(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ username: 'self_updated' });
      expect(selfUpdate.status).toBe(200);

      const otherUpdate = await request(app)
        .put(`/users/${adminId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ username: 'hacked' });
      expect(otherUpdate.status).toBe(403);

      const adminUpdate = await request(app)
        .put(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'admin_updated' });
      expect(adminUpdate.status).toBe(200);
    });

    it('should enforce admin-only for user creation endpoints', async () => {
      const userPost = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ username: 'test', password: 'pass' });
      expect(userPost.status).toBe(403);

      const createUser = await request(app)
        .post('/users/create-user')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ username: 'test', password: 'pass' });
      expect(createUser.status).toBe(403);
    });
  });

  describe('Authentication Tests', () => {
    it('should reject requests without token', async () => {
      const endpoints = [
        { method: 'GET', path: '/users' },
        { method: 'POST', path: '/users' },
        { method: 'GET', path: `/users/${userId}` },
        { method: 'PUT', path: `/users/${userId}` },
        { method: 'DELETE', path: `/users/${userId}` },
      ];

      for (const endpoint of endpoints) {
        const response = await (request(app) as any)[endpoint.method.toLowerCase()](endpoint.path);
        expect(response.status).toBe(401);
      }
    });

    it('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/users')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
    });
  });
});