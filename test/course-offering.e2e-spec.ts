import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { RoleName } from '../src/shared/Types/roles.enum';
import { University } from '../src/modules/University/university.entity';
import { Career } from '../src/modules/Career/career.entity';
import { CareerSubject } from '../src/modules/CareerSubject/career_subject.entity';
import {
  createTestApp,
  closeTestApp,
  seedRole,
  seedUser,
  seedUniversity,
  seedCareer,
  seedCareerSubject,
} from './utils/e2e-setup';

describe('CourseOffering (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let studentToken: string;
  let university: University;
  let career: Career;
  let careerSubject: CareerSubject;

  beforeAll(async () => {
    app = await createTestApp();

    const adminRole = await seedRole(app, RoleName.ADMIN);
    const studentRole = await seedRole(app, RoleName.STUDENT);

    await seedUser(app, {
      email: 'admin@guniver.test',
      password: 'AdminPass123',
      firstName: 'Admin',
      lastName: 'One',
      role: adminRole,
    });
    await seedUser(app, {
      email: 'student@guniver.test',
      password: 'StudentPass123',
      firstName: 'Student',
      lastName: 'One',
      role: studentRole,
    });

    university = await seedUniversity(app, { name: 'Universidad de Prueba', acronym: 'UP' });
    career = await seedCareer(app, { name: 'Ingeniería en Sistemas', university });
    careerSubject = await seedCareerSubject(app, { name: 'Bases de Datos', career });

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

  it('POST /course-offerings/confirm creates commissions (admin only)', async () => {
    const response = await request(app.getHttpServer())
      .post('/course-offerings/confirm')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        careerId: career.id,
        year: 2026,
        period: 'second',
        commissions: [
          {
            careerSubjectId: careerSubject.id,
            commission: '1035-3-G14',
            modality: 'Presencial',
            slots: [
              { dayOfWeek: 2, startTime: '15:00', endTime: '17:59' },
              { dayOfWeek: 3, startTime: '15:00', endTime: '17:59' },
            ],
          },
          {
            careerSubjectId: careerSubject.id,
            commission: '1035-4-G14',
            modality: 'Presencial',
            slots: [{ dayOfWeek: 2, startTime: '18:00', endTime: '20:59' }],
            excluded: true,
          },
        ],
      })
      .expect(201);

    expect(response.body.created).toBe(1);
    expect(response.body.skipped).toBe(1);
    expect(response.body.errors).toEqual([]);
  });

  it('POST /course-offerings/confirm is forbidden for non-admin', async () => {
    await request(app.getHttpServer())
      .post('/course-offerings/confirm')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ careerId: career.id, year: 2026, period: 'second', commissions: [] })
      .expect(403);
  });

  it('GET /course-offerings lists commissions for a career/year/period', async () => {
    const response = await request(app.getHttpServer())
      .get('/course-offerings')
      .query({ careerId: career.id, year: 2026, period: 'second' })
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].commission).toBe('1035-3-G14');
    expect(response.body[0].subjectName).toBe('Bases de Datos');
    expect(response.body[0].slots).toHaveLength(2);
  });

  it('POST /course-offerings/confirm replaces the existing catalog for that career/year/period', async () => {
    await request(app.getHttpServer())
      .post('/course-offerings/confirm')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        careerId: career.id,
        year: 2026,
        period: 'second',
        commissions: [
          {
            careerSubjectId: careerSubject.id,
            commission: '1035-3-G14-DEFINITIVO',
            modality: 'Presencial',
            slots: [{ dayOfWeek: 4, startTime: '10:00', endTime: '12:59' }],
          },
        ],
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/course-offerings')
      .query({ careerId: career.id, year: 2026, period: 'second' })
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].commission).toBe('1035-3-G14-DEFINITIVO');
  });

  it('POST /course-offerings/preview is forbidden for non-admin', async () => {
    await request(app.getHttpServer())
      .post('/course-offerings/preview')
      .query({ careerId: career.id })
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);
  });
});
