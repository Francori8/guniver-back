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

describe('Role (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;

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

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@guniver.test', password: 'AdminPass123' })
      .expect(201);
    adminToken = login.body.access_token;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('POST /role requires authentication', async () => {
    await request(app.getHttpServer())
      .post('/role')
      .send({ name: 'Bibliotecario' })
      .expect(401);
  });

  it('POST /role creates a role for an authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .post('/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bibliotecario' })
      .expect(201);

    expect(response.body.name).toBe('Bibliotecario');
  });

  it('POST /role rejects a duplicate role name', async () => {
    await request(app.getHttpServer())
      .post('/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bibliotecario' })
      .expect(400);
  });

  it('GET /role lists all roles', async () => {
    const response = await request(app.getHttpServer())
      .get('/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.some((r: any) => r.name === 'Bibliotecario')).toBe(
      true,
    );
  });

  it('GET /role/:id returns a role by id', async () => {
    const created = await request(app.getHttpServer())
      .post('/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Tutor' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/role/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.name).toBe('Tutor');
  });

  it('GET /role/:id returns 400 for a non-existent role', async () => {
    await request(app.getHttpServer())
      .get('/role/999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });
});
