import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { RoleName } from '../src/shared/Types/roles.enum';
import {
  createTestApp,
  closeTestApp,
  seedRole,
  seedUser,
} from './utils/e2e-setup';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();

    const adminRole = await seedRole(app, RoleName.ADMIN);
    await seedUser(app, {
      email: 'admin@guniver.test',
      password: 'AdminPass123',
      firstName: 'Admin',
      lastName: 'User',
      role: adminRole,
    });

    const studentRole = await seedRole(app, RoleName.STUDENT);
    await seedUser(app, {
      email: 'student@guniver.test',
      password: 'StudentPass123',
      firstName: 'Student',
      lastName: 'User',
      role: studentRole,
      isActive: false,
    });
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('POST /auth/login rejects wrong credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@guniver.test', password: 'wrong-password' })
      .expect(401);
  });

  it('POST /auth/login succeeds and sets guniver_token cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@guniver.test', password: 'AdminPass123' })
      .expect(201);

    expect(response.body.access_token).toBeDefined();
    expect(response.body.user.email).toBe('admin@guniver.test');
    expect(
      response.headers['set-cookie']?.some((c: string) =>
        c.startsWith('guniver_token='),
      ),
    ).toBe(true);
  });

  it('GET /auth/me returns 401 without a token', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('GET /auth/me returns the current user with a valid bearer token', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@guniver.test', password: 'AdminPass123' })
      .expect(201);

    const token = login.body.access_token;

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(me.body.user.email).toBe('admin@guniver.test');
  });

  it('POST /auth/logout clears the auth cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .expect(201);

    expect(
      response.headers['set-cookie']?.some((c: string) =>
        c.startsWith('guniver_token=;'),
      ),
    ).toBe(true);
  });
});
