import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { RoleName } from '../src/shared/Types/roles.enum';
import {
  createTestApp,
  closeTestApp,
  seedRole,
  seedUser,
  seedUniversity,
  seedCareer,
} from './utils/e2e-setup';

describe('AccessRequest (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let universityId: number;
  let careerId: number;

  beforeAll(async () => {
    app = await createTestApp();

    const adminRole = await seedRole(app, RoleName.ADMIN);
    await seedRole(app, RoleName.STUDENT);
    await seedUser(app, {
      email: 'admin@guniver.test',
      password: 'AdminPass123',
      firstName: 'Admin',
      lastName: 'User',
      role: adminRole,
    });

    const university = await seedUniversity(app, {
      name: 'Universidad de Prueba',
      acronym: 'UP',
    });
    universityId = university.id;

    const career = await seedCareer(app, {
      name: 'Ingeniería en Sistemas',
      university,
    });
    careerId = career.id;

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@guniver.test', password: 'AdminPass123' })
      .expect(201);
    adminToken = login.body.access_token;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('POST /access-requests is public and creates a pending request', async () => {
    const response = await request(app.getHttpServer())
      .post('/access-requests')
      .send({
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan.perez@example.com',
      })
      .expect(201);

    expect(response.body.status).toBe('pending');
  });

  it('POST /access-requests rejects a duplicate pending request for the same email', async () => {
    await request(app.getHttpServer())
      .post('/access-requests')
      .send({
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan.perez@example.com',
      })
      .expect(400);
  });

  it('GET /access-requests requires authentication', async () => {
    await request(app.getHttpServer()).get('/access-requests').expect(401);
  });

  it('GET /access-requests lists requests for an admin', async () => {
    const response = await request(app.getHttpServer())
      .get('/access-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(
      response.body.some((r: any) => r.email === 'juan.perez@example.com'),
    ).toBe(true);
  });

  it('PATCH /access-requests/:id/approve creates a user and marks the request approved', async () => {
    const created = await request(app.getHttpServer())
      .post('/access-requests')
      .send({
        firstName: 'María',
        lastName: 'Gómez',
        email: 'maria.gomez@example.com',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/access-requests/${created.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        universityId,
        careerId,
        enrollmentDate: '2026-01-01',
      })
      .expect(200);

    expect(response.body.status).toBe('approved');
    expect(response.body.userId).toBeDefined();
  });

  it('PATCH /access-requests/:id/approve fails for an already reviewed request', async () => {
    const created = await request(app.getHttpServer())
      .post('/access-requests')
      .send({
        firstName: 'Ana',
        lastName: 'López',
        email: 'ana.lopez@example.com',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/access-requests/${created.body.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/access-requests/${created.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ universityId, careerId, enrollmentDate: '2026-01-01' })
      .expect(400);
  });

  it('PATCH /access-requests/:id/reject marks the request rejected', async () => {
    const created = await request(app.getHttpServer())
      .post('/access-requests')
      .send({
        firstName: 'Carlos',
        lastName: 'Ruiz',
        email: 'carlos.ruiz@example.com',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/access-requests/${created.body.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.status).toBe('rejected');
  });
});
