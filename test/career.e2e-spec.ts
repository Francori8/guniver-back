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
} from './utils/e2e-setup';

describe('Career (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let studentToken: string;
  let university: University;
  let university2: University;

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
    university2 = await seedUniversity(app, {
      name: 'Otra Universidad',
      acronym: 'OU',
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

  it('POST /careers is forbidden for a non-admin user', async () => {
    await request(app.getHttpServer())
      .post('/careers')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ name: 'Ingeniería en Sistemas', universityId: university.id })
      .expect(403);
  });

  it('POST /careers fails with a non-existent universityId', async () => {
    await request(app.getHttpServer())
      .post('/careers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ingeniería en Sistemas', universityId: 999999 })
      .expect(404);
  });

  it('POST /careers creates a career for an admin', async () => {
    const response = await request(app.getHttpServer())
      .post('/careers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ingeniería en Sistemas', universityId: university.id })
      .expect(201);

    expect(response.body.name).toBe('Ingeniería en Sistemas');
    expect(response.body.university.id).toBe(university.id);
  });

  it('GET /careers/university/:universityId filters by university', async () => {
    await request(app.getHttpServer())
      .post('/careers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Licenciatura en Física', universityId: university2.id })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/careers/university/${university.id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(
      response.body.every((c: any) => c.university.id === university.id),
    ).toBe(true);
  });

  it('PUT /careers/:id updates only the provided fields', async () => {
    const created = await request(app.getHttpServer())
      .post('/careers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Carrera Original',
        description: 'Descripción original',
        universityId: university.id,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .put(`/careers/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Carrera Actualizada' })
      .expect(200);

    expect(response.body.name).toBe('Carrera Actualizada');
    expect(response.body.description).toBe('Descripción original');
    expect(response.body.university.id).toBe(university.id);
  });

  it('DELETE /careers/:id removes a career for an admin', async () => {
    const created = await request(app.getHttpServer())
      .post('/careers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Carrera a Borrar', universityId: university.id })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/careers/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/careers/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
