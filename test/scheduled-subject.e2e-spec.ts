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
  seedStudentProfile,
  findUserByEmail,
} from './utils/e2e-setup';

describe('ScheduledSubject (e2e)', () => {
  let app: INestApplication<App>;
  let studentToken: string;
  let otherStudentToken: string;
  let university: University;
  let career: Career;
  let careerSubjectA: CareerSubject;
  let careerSubjectB: CareerSubject;
  let termId: number;

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
    careerSubjectA = await seedCareerSubject(app, { name: 'Matemática 1', career });
    careerSubjectB = await seedCareerSubject(app, { name: 'Programación 1', career });

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

    const term = await request(app.getHttpServer())
      .post('/terms')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ careerId: career.id, year: 2026, period: 'second' })
      .expect(201);
    termId = term.body.id;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('POST creates a scheduled subject with slots', async () => {
    const response = await request(app.getHttpServer())
      .post(`/terms/${termId}/scheduled-subjects`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        careerSubjectId: careerSubjectA.id,
        slots: [{ dayOfWeek: 1, startTime: '08:00', endTime: '10:00' }],
      })
      .expect(201);

    expect(response.body.status).toBe('tentativo');
    expect(response.body.slots).toHaveLength(1);
    expect(response.body.subjectName).toBe('Matemática 1');
  });

  it('POST fails when the term does not belong to the requester', async () => {
    await request(app.getHttpServer())
      .post(`/terms/${termId}/scheduled-subjects`)
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .send({
        careerSubjectId: careerSubjectB.id,
        slots: [{ dayOfWeek: 2, startTime: '08:00', endTime: '10:00' }],
      })
      .expect(403);
  });

  it('POST rejects a duplicate careerSubject in the same term', async () => {
    await request(app.getHttpServer())
      .post(`/terms/${termId}/scheduled-subjects`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        careerSubjectId: careerSubjectA.id,
        slots: [{ dayOfWeek: 3, startTime: '08:00', endTime: '10:00' }],
      })
      .expect(400);
  });

  it('POST rejects overlapping slots with another scheduled subject in the same term', async () => {
    await request(app.getHttpServer())
      .post(`/terms/${termId}/scheduled-subjects`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        careerSubjectId: careerSubjectB.id,
        slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '11:00' }],
      })
      .expect(400);
  });

  it('POST allows overlapping slots when marked isException', async () => {
    const response = await request(app.getHttpServer())
      .post(`/terms/${termId}/scheduled-subjects`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        careerSubjectId: careerSubjectB.id,
        slots: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '11:00', isException: true },
        ],
      })
      .expect(201);

    expect(response.body.slots[0].isException).toBe(true);
  });

  it('GET lists only the scheduled subjects of the owned term', async () => {
    const response = await request(app.getHttpServer())
      .get(`/terms/${termId}/scheduled-subjects`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(response.body).toHaveLength(2);
  });

  it('GET is forbidden for a term that is not mine', async () => {
    await request(app.getHttpServer())
      .get(`/terms/${termId}/scheduled-subjects`)
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .expect(403);
  });

  it('PUT updates the status and replaces slots', async () => {
    const created = await request(app.getHttpServer())
      .get(`/terms/${termId}/scheduled-subjects`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    const target = created.body.find(
      (s: any) => s.careerSubjectId === careerSubjectA.id,
    );

    const updated = await request(app.getHttpServer())
      .put(`/terms/${termId}/scheduled-subjects/${target.id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        status: 'confirmado',
        slots: [{ dayOfWeek: 4, startTime: '14:00', endTime: '16:00' }],
      })
      .expect(200);

    expect(updated.body.status).toBe('confirmado');
    expect(updated.body.slots).toHaveLength(1);
    expect(updated.body.slots[0].dayOfWeek).toBe(4);
  });

  it('DELETE removes a scheduled subject', async () => {
    const created = await request(app.getHttpServer())
      .get(`/terms/${termId}/scheduled-subjects`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    const target = created.body.find(
      (s: any) => s.careerSubjectId === careerSubjectA.id,
    );

    await request(app.getHttpServer())
      .delete(`/terms/${termId}/scheduled-subjects/${target.id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    const remaining = await request(app.getHttpServer())
      .get(`/terms/${termId}/scheduled-subjects`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    expect(
      remaining.body.find((s: any) => s.careerSubjectId === careerSubjectA.id),
    ).toBeUndefined();
  });

  describe('GET /scheduled-subjects?termIds= (combined)', () => {
    let secondCareer: Career;
    let secondCareerSubject: CareerSubject;
    let secondTermId: number;

    beforeAll(async () => {
      secondCareer = await seedCareer(app, { name: 'Licenciatura en Sistemas', university });
      secondCareerSubject = await seedCareerSubject(app, {
        name: 'Álgebra',
        career: secondCareer,
      });
      await seedStudentProfile(app, {
        user: (await findUserByEmail(app, 'student@guniver.test'))!,
        university,
        career: secondCareer,
      });

      const term = await request(app.getHttpServer())
        .post('/terms')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ careerId: secondCareer.id, year: 2026, period: 'second' })
        .expect(201);
      secondTermId = term.body.id;

      await request(app.getHttpServer())
        .post(`/terms/${secondTermId}/scheduled-subjects`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          careerSubjectId: secondCareerSubject.id,
          slots: [{ dayOfWeek: 5, startTime: '10:00', endTime: '12:00' }],
        })
        .expect(201);
    });

    it('combines scheduled subjects from multiple owned terms', async () => {
      const response = await request(app.getHttpServer())
        .get(`/scheduled-subjects?termIds=${termId},${secondTermId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const termIdsInResponse = response.body.map((s: any) => s.termId);
      expect(termIdsInResponse).toEqual(
        expect.arrayContaining([termId, secondTermId]),
      );
    });

    it('rejects if any of the requested terms does not belong to the requester', async () => {
      await request(app.getHttpServer())
        .get(`/scheduled-subjects?termIds=${termId},${secondTermId}`)
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .expect(403);
    });
  });
});
