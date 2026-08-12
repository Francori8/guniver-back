import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { RoleName } from '../src/shared/Types/roles.enum';
import { University } from '../src/modules/University/university.entity';
import {
  createTestApp,
  closeTestApp,
  seedRole,
  seedUser,
  seedUniversity,
  seedCareer,
} from './utils/e2e-setup';

describe('CareerRequest (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let studentToken: string;
  let university: University;
  let universityId: number;
  let careerId: number;

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

    university = await seedUniversity(app, {
      name: 'Universidad de Prueba',
      acronym: 'UP',
    });
    universityId = university.id;

    const career = await seedCareer(app, {
      name: 'Ingeniería en Sistemas',
      university,
    });
    careerId = career.id;

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

  it('POST /career-requests requires authentication', async () => {
    await request(app.getHttpServer())
      .post('/career-requests')
      .send({ universityId, careerId })
      .expect(401);
  });

  it('POST /career-requests creates a pending request for a logged in user', async () => {
    const response = await request(app.getHttpServer())
      .post('/career-requests')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ universityId, careerId, message: 'Quiero sumar esta carrera' })
      .expect(201);

    expect(response.body.status).toBe('pending');
  });

  it('POST /career-requests rejects a duplicate pending request for the same career', async () => {
    await request(app.getHttpServer())
      .post('/career-requests')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ universityId, careerId })
      .expect(400);
  });

  it('GET /career-requests is forbidden for a non-admin user', async () => {
    await request(app.getHttpServer())
      .get('/career-requests')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);
  });

  it('GET /career-requests lists requests for an admin', async () => {
    const response = await request(app.getHttpServer())
      .get('/career-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('PATCH /career-requests/:id/approve creates a student profile and marks it approved', async () => {
    const career2 = await seedCareer(app, {
      name: 'Licenciatura en Matemática',
      university,
    });

    const created = await request(app.getHttpServer())
      .post('/career-requests')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ universityId, careerId: career2.id })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/career-requests/${created.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ enrollmentDate: '2026-01-01' })
      .expect(200);

    expect(response.body.status).toBe('approved');
  });

  it('PATCH /career-requests/:id/reject marks the request rejected', async () => {
    const career3 = await seedCareer(app, {
      name: 'Licenciatura en Física',
      university,
    });

    const created = await request(app.getHttpServer())
      .post('/career-requests')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ universityId, careerId: career3.id })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/career-requests/${created.body.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.status).toBe('rejected');
  });
});
