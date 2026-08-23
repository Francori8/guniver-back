import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { RoleName } from '../src/shared/Types/roles.enum';
import { University } from '../src/modules/University/university.entity';
import { Career } from '../src/modules/Career/career.entity';
import { Subject } from '../src/modules/Subject/subject.entity';
import {
  createTestApp,
  closeTestApp,
  seedRole,
  seedUser,
  seedUniversity,
  seedCareer,
  seedSubject,
} from './utils/e2e-setup';

describe('CareerSubject (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let studentToken: string;
  let university: University;
  let career: Career;
  let subject: Subject;

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
    career = await seedCareer(app, { name: 'Ingeniería en Sistemas', university });
    subject = await seedSubject(app, { name: 'Álgebra I', career });

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

  it('POST /subjects with careerIds implicitly creates a CareerSubject row', async () => {
    const created = await request(app.getHttpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Física I', careerIds: [career.id] })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/career-subjects?careerId=${career.id}&subjectId=${created.body.id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(response.body.subject.id).toBe(created.body.id);
    expect(response.body.career.id).toBe(career.id);
  });

  it('GET /career-subjects?careerId lists all rows for the career', async () => {
    const response = await request(app.getHttpServer())
      .get(`/career-subjects?careerId=${career.id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(
      response.body.some((cs: any) => cs.subject.id === subject.id),
    ).toBe(true);
  });

  it('PUT /career-subjects/:id updates moduleId and credits', async () => {
    const module = await request(app.getHttpServer())
      .post('/study-plan-modules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ciclo Básico', careerId: career.id })
      .expect(201);

    const careerSubject = await request(app.getHttpServer())
      .get(`/career-subjects?careerId=${career.id}&subjectId=${subject.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const response = await request(app.getHttpServer())
      .put(`/career-subjects/${careerSubject.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ moduleId: module.body.id, credits: 8 })
      .expect(200);

    expect(response.body.module.id).toBe(module.body.id);
    expect(response.body.credits).toBe(8);
  });

  it('DELETE /career-subjects/:id is blocked when it has its own requirements', async () => {
    const targetSubject = await seedSubject(app, { name: 'Análisis I', career });
    const targetCareerSubject = await request(app.getHttpServer())
      .get(`/career-subjects?careerId=${career.id}&subjectId=${targetSubject.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .put(`/career-subjects/${targetCareerSubject.body.id}/requirements/cursar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ type: 'subject_approved', targetCareerSubjectId: (
          await request(app.getHttpServer())
            .get(`/career-subjects?careerId=${career.id}&subjectId=${subject.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
        ).body.id }],
      })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/career-subjects/${targetCareerSubject.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('DELETE /career-subjects/:id is blocked when it is a target of another requirement', async () => {
    const careerSubjectForSubject = await request(app.getHttpServer())
      .get(`/career-subjects?careerId=${career.id}&subjectId=${subject.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/career-subjects/${careerSubjectForSubject.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('DELETE /career-subjects/:id removes a row with no dependents', async () => {
    const freeSubject = await seedSubject(app, { name: 'Química I', career });
    const freeCareerSubject = await request(app.getHttpServer())
      .get(`/career-subjects?careerId=${career.id}&subjectId=${freeSubject.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/career-subjects/${freeCareerSubject.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/career-subjects/${freeCareerSubject.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
