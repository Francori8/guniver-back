import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { RoleName } from '../src/shared/Types/roles.enum';
import { createTestApp, closeTestApp, seedRole, seedUser } from './utils/e2e-setup';

describe('University (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let studentToken: string;

  beforeAll(async () => {
    app = await createTestApp();

    const adminRole = await seedRole(app, RoleName.ADMIN);
    const studentRole = await seedRole(app, RoleName.STUDENT);

    await seedUser(app, {
      email: 'admin@guniver.test',
      password: 'AdminPass123',
      firstName: 'Admin',
      lastName: 'User',
      role: adminRole,
    });
    await seedUser(app, {
      email: 'student@guniver.test',
      password: 'StudentPass123',
      firstName: 'Student',
      lastName: 'User',
      role: studentRole,
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@guniver.test', password: 'AdminPass123' })
      .expect(201);
    adminToken = adminLogin.body.access_token;

    const studentLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'student@guniver.test', password: 'StudentPass123' })
      .expect(201);
    studentToken = studentLogin.body.access_token;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('POST /universities is forbidden for a non-admin user', async () => {
    await request(app.getHttpServer())
      .post('/universities')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ name: 'Universidad de Prueba', acronym: 'UP' })
      .expect(403);
  });

  it('POST /universities creates a university for an admin', async () => {
    const response = await request(app.getHttpServer())
      .post('/universities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Universidad de Prueba', acronym: 'UP' })
      .expect(201);

    expect(response.body.name).toBe('Universidad de Prueba');
  });

  it('GET /universities lists universities for an authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .get('/universities')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(
      response.body.some((u: any) => u.name === 'Universidad de Prueba'),
    ).toBe(true);
  });

  it('PUT /universities/:id updates only the provided fields', async () => {
    const created = await request(app.getHttpServer())
      .post('/universities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Universidad Original', acronym: 'UO', website: 'https://uo.edu' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .put(`/universities/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Universidad Actualizada' })
      .expect(200);

    expect(response.body.name).toBe('Universidad Actualizada');
    expect(response.body.acronym).toBe('UO');
    expect(response.body.website).toBe('https://uo.edu');
  });

  it('DELETE /universities/:id removes a university for an admin', async () => {
    const created = await request(app.getHttpServer())
      .post('/universities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Universidad a Borrar', acronym: 'UB' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/universities/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/universities/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
