import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { RoleName } from '../src/shared/Types/roles.enum';
import { University } from '../src/modules/University/university.entity';
import { Career } from '../src/modules/Career/career.entity';
import {
  createTestApp,
  closeTestApp,
  seedRole,
  seedUser,
  seedUniversity,
  seedCareer,
  seedStudentProfile,
} from './utils/e2e-setup';

describe('Term (e2e)', () => {
  let app: INestApplication<App>;
  let studentToken: string;
  let otherStudentToken: string;
  let university: University;
  let career: Career;

  beforeAll(async () => {
    app = await createTestApp();

    const studentRole = await seedRole(app, RoleName.STUDENT);

    const student = await seedUser(app, {
      email: 'student@guniver.test',
      password: 'StudentPass123',
      firstName: 'Student',
      lastName: 'One',
      role: studentRole,
    });
    const otherStudent = await seedUser(app, {
      email: 'other@guniver.test',
      password: 'StudentPass123',
      firstName: 'Student',
      lastName: 'Two',
      role: studentRole,
    });

    university = await seedUniversity(app, { name: 'Universidad de Prueba', acronym: 'UP' });
    career = await seedCareer(app, { name: 'Ingeniería en Sistemas', university });

    await seedStudentProfile(app, { user: student, university, career });

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'student@guniver.test', password: 'StudentPass123' })
      .expect(201);
    studentToken = login.body.access_token;

    const otherLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'other@guniver.test', password: 'StudentPass123' })
      .expect(201);
    otherStudentToken = otherLogin.body.access_token;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('POST /terms creates a term for a student with a profile in that career', async () => {
    const response = await request(app.getHttpServer())
      .post('/terms')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ careerId: career.id, year: 2023, period: 'first' })
      .expect(201);

    expect(response.body.year).toBe(2023);
    expect(response.body.period).toBe('first');
    expect(response.body.career.id).toBe(career.id);
  });

  it('POST /terms fails for a student without a profile in that career', async () => {
    await request(app.getHttpServer())
      .post('/terms')
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .send({ careerId: career.id, year: 2023, period: 'first' })
      .expect(404);
  });

  it('POST /terms rejects a duplicate year+period for the same student', async () => {
    await request(app.getHttpServer())
      .post('/terms')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ careerId: career.id, year: 2023, period: 'first' })
      .expect(400);
  });

  it('GET /terms lists only my own terms', async () => {
    const response = await request(app.getHttpServer())
      .get(`/terms?careerId=${career.id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].year).toBe(2023);
  });

  it('GET /terms/:id and PUT /terms/:id are forbidden for a term that is not mine', async () => {
    const created = await request(app.getHttpServer())
      .post('/terms')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ careerId: career.id, year: 2024, period: 'first' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/terms/${created.body.id}`)
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .put(`/terms/${created.body.id}`)
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .send({ label: 'hack' })
      .expect(403);
  });

  it('DELETE /terms/:id removes the term and its subject-progress in cascade', async () => {
    const created = await request(app.getHttpServer())
      .post('/terms')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ careerId: career.id, year: 2025, period: 'second' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/terms/${created.body.id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/terms/${created.body.id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(404);
  });
});
