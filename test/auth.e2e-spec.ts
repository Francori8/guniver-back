import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { RoleName } from '../src/shared/Types/roles.enum';
import {
  createTestApp,
  closeTestApp,
  seedRole,
  seedUser,
  findUserByEmail,
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

  it('POST /auth/login succeeds and returns an access token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@guniver.test', password: 'AdminPass123' })
      .expect(201);

    expect(response.body.access_token).toBeDefined();
    expect(response.body.user.email).toBe('admin@guniver.test');
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

  it('POST /auth/logout responds successfully', async () => {
    await request(app.getHttpServer()).post('/auth/logout').expect(201);
  });

  it('POST /auth/forgot-password always responds 200, even for an unknown email', async () => {
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'no-existe@guniver.test' })
      .expect(201);
  });

  it('POST /auth/forgot-password sets a reset token on the user', async () => {
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'admin@guniver.test' })
      .expect(201);

    const user = await findUserByEmail(app, 'admin@guniver.test');
    expect(user?.inviteToken).toBeDefined();
    expect(user?.inviteTokenExpiresAt).toBeDefined();
  }, 10000);

  it('POST /auth/reset-password rejects an invalid token', async () => {
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: 'not-a-real-token', password: 'NuevaPass123' })
      .expect(400);
  });

  it('POST /auth/reset-password sets a new password and logs the user in', async () => {
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'admin@guniver.test' })
      .expect(201);

    const user = await findUserByEmail(app, 'admin@guniver.test');
    const token = user!.inviteToken!;

    const response = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, password: 'NuevaPass123' })
      .expect(201);

    expect(response.body.access_token).toBeDefined();
    expect(response.body.user.email).toBe('admin@guniver.test');

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@guniver.test', password: 'NuevaPass123' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, password: 'OtraPass123' })
      .expect(400);
  });

  it('POST /auth/change-password requires authentication', async () => {
    await request(app.getHttpServer())
      .post('/auth/change-password')
      .send({ currentPassword: 'StudentPass123', newPassword: 'NuevaPass456' })
      .expect(401);
  });

  it('POST /auth/change-password rejects the wrong current password', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@guniver.test', password: 'NuevaPass123' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${login.body.access_token}`)
      .send({ currentPassword: 'wrong-password', newPassword: 'NuevaPass456' })
      .expect(400);
  });

  it('POST /auth/change-password updates the password when the current one is correct', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@guniver.test', password: 'NuevaPass123' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${login.body.access_token}`)
      .send({ currentPassword: 'NuevaPass123', newPassword: 'NuevaPass456' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@guniver.test', password: 'NuevaPass123' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@guniver.test', password: 'NuevaPass456' })
      .expect(201);
  });
});
