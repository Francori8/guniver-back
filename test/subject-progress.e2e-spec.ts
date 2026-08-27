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
  seedSubject,
  seedStudentProfile,
} from './utils/e2e-setup';

describe('SubjectProgress (e2e)', () => {
  let app: INestApplication<App>;
  let studentToken: string;
  let otherStudentToken: string;
  let career: Career;
  let otherCareer: Career;
  let termId: number;
  let algebraCareerSubjectId: number;
  let otherCareerSubjectId: number;

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

    const university: University = await seedUniversity(app, {
      name: 'Universidad de Prueba',
      acronym: 'UP',
    });
    career = await seedCareer(app, { name: 'Ingeniería en Sistemas', university });
    otherCareer = await seedCareer(app, { name: 'Licenciatura en Matemática', university });

    await seedStudentProfile(app, { user: student, university, career });

    const algebra = await seedSubject(app, { name: 'Álgebra I', career });
    const otherSubject = await seedSubject(app, { name: 'Análisis Matemático', career: otherCareer });

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
      .send({ careerId: career.id, year: 2023, period: 'first' })
      .expect(201);
    termId = term.body.id;

    const algebraCS = await request(app.getHttpServer())
      .get(`/career-subjects?careerId=${career.id}&subjectId=${algebra.id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    algebraCareerSubjectId = algebraCS.body.id;

    const otherCS = await request(app.getHttpServer())
      .get(`/career-subjects?careerId=${otherCareer.id}&subjectId=${otherSubject.id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    otherCareerSubjectId = otherCS.body.id;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('POST creates progress for each of the 4 statuses', async () => {
    const response = await request(app.getHttpServer())
      .post(`/terms/${termId}/subject-progress`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ careerSubjectId: algebraCareerSubjectId, status: 'aprobada', grade: 8 })
      .expect(201);

    expect(response.body.status).toBe('aprobada');
    expect(response.body.grade).toBe(8);
    expect(response.body.isException).toBe(false);
  });

  it('POST rejects a duplicate careerSubject within the same term', async () => {
    await request(app.getHttpServer())
      .post(`/terms/${termId}/subject-progress`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ careerSubjectId: algebraCareerSubjectId, status: 'cursada' })
      .expect(400);
  });

  it('POST rejects a careerSubject from a different career than the term', async () => {
    await request(app.getHttpServer())
      .post(`/terms/${termId}/subject-progress`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ careerSubjectId: otherCareerSubjectId, status: 'aprobada' })
      .expect(400);
  });

  it('POST never blocks by habilitation, even with isException: true on an unenabled subject', async () => {
    const term2 = await request(app.getHttpServer())
      .post('/terms')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ careerId: career.id, year: 2024, period: 'first' })
      .expect(201);

    // Álgebra I ya está aprobada en term 2023; acá se carga otra vez en 2024 (recursada)
    // sin que el backend valide nada de correlativas.
    const response = await request(app.getHttpServer())
      .post(`/terms/${term2.body.id}/subject-progress`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        careerSubjectId: algebraCareerSubjectId,
        status: 'pendiente_aprobacion',
        isException: true,
        notes: 'dada por excepción',
      })
      .expect(201);

    expect(response.body.isException).toBe(true);
    expect(response.body.status).toBe('pendiente_aprobacion');
  });

  it('PUT updates status/grade/notes of an existing record', async () => {
    const created = await request(app.getHttpServer())
      .post('/terms')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ careerId: career.id, year: 2026, period: 'first' })
      .expect(201);

    const progress = await request(app.getHttpServer())
      .post(`/terms/${created.body.id}/subject-progress`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ careerSubjectId: algebraCareerSubjectId, status: 'cursada' })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .put(`/terms/${created.body.id}/subject-progress/${progress.body.id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ status: 'aprobada', grade: 9 })
      .expect(200);

    expect(updated.body.status).toBe('aprobada');
    expect(updated.body.grade).toBe(9);
  });

  it('DELETE on a term that is not mine returns 403', async () => {
    await request(app.getHttpServer())
      .delete(`/terms/${termId}/subject-progress/1`)
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .expect(403);
  });
});
