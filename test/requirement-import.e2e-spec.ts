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

describe('RequirementImport (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let studentToken: string;
  let career: Career;
  let subject: Subject;
  let careerSubjectId: number;

  const SAMPLE_HTML = `
    <td class="td-table-correlativas">
      <h3>Para cursar</h3>
      <h4>Opción 1</h4>
      <table class="table table-bordered table-condensed table-correlativas">
        <tr><th>Requisito</th><th>Condición</th></tr>
        <tr><td>Matemática I (01033)</td><td><b>Aprobada</b></td></tr>
      </table>
      <h3>Para aprobar</h3>
      <h4>Opción 1</h4>
      <table class="table table-bordered table-condensed table-correlativas">
        <tr><th>Requisito</th><th>Condición</th></tr>
        <tr><td>Matemática I (01033)</td><td><b>Aprobada</b></td></tr>
      </table>
    </td>
  `;

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

    const university: University = await seedUniversity(app, {
      name: 'Universidad de Prueba',
      acronym: 'UP',
    });
    career = await seedCareer(app, { name: 'Ingeniería en Sistemas', university });
    subject = await seedSubject(app, { name: 'Análisis I', career });

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

    const careerSubjectsRes = await request(app.getHttpServer())
      .get(`/career-subjects?careerId=${career.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    careerSubjectId = careerSubjectsRes.body.find(
      (cs: any) => cs.subject.id === subject.id,
    ).id;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('POST /requirement-import/preview without html returns 400', async () => {
    await request(app.getHttpServer())
      .post(`/requirement-import/preview?careerSubjectId=${careerSubjectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ html: '' })
      .expect(400);
  });

  it('POST /requirement-import/preview returns 404 for an unknown careerSubject', async () => {
    await request(app.getHttpServer())
      .post('/requirement-import/preview?careerSubjectId=999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ html: SAMPLE_HTML })
      .expect(404);
  });

  it('POST /requirement-import/preview forbids non-admin users', async () => {
    await request(app.getHttpServer())
      .post(`/requirement-import/preview?careerSubjectId=${careerSubjectId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ html: SAMPLE_HTML })
      .expect(403);
  });

  it('POST /requirement-import/preview parses subject_approved correctly', async () => {
    const response = await request(app.getHttpServer())
      .post(`/requirement-import/preview?careerSubjectId=${careerSubjectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ html: SAMPLE_HTML })
      .expect(201);

    expect(response.body.sections).toHaveLength(2);
    expect(response.body.sections[0].kind).toBe('cursar');
    expect(response.body.sections[0].items[0].subjectCode).toBe('01033');
  });

  it('POST /requirement-import/preview unwraps the raw SIU JSON response ({"cod":"1","cont":"..."})', async () => {
    // Lo que el admin realmente copia desde la pestaña Network de DevTools no es
    // HTML puro, sino el cuerpo crudo de la respuesta del SIU: un JSON (con saltos
    // de línea reales sin escapar dentro del string, técnicamente inválido para
    // JSON.parse estricto) que envuelve el HTML en la propiedad "cont".
    const rawSiuResponse =
      '{"cod":"1","cont":"<td class=\\"td-table-correlativas\\"><h3>Para cursar\n<\\/h3><h4>Opci\\u00f3n 1<\\/h4><table class=\\"table-correlativas\\"><tr><th>Requisito<\\/th><th>Condici\\u00f3n<\\/th><\\/tr><tr><td>Matem\\u00e1tica I (01033)<\\/td><td><b>Aprobada<\\/b><\\/td><\\/tr><\\/table><\\/td>"}';

    const response = await request(app.getHttpServer())
      .post(`/requirement-import/preview?careerSubjectId=${careerSubjectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ html: rawSiuResponse })
      .expect(201);

    expect(response.body.sections).toHaveLength(1);
    expect(response.body.sections[0].kind).toBe('cursar');
    expect(response.body.sections[0].items[0].subjectCode).toBe('01033');
  });

  it('POST /requirement-import/confirm with empty sections saves nothing', async () => {
    const response = await request(app.getHttpServer())
      .post('/requirement-import/confirm')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ careerSubjectId, sections: [] })
      .expect(201);

    expect(response.body.groupsSaved).toBe(0);
    expect(response.body.errors).toHaveLength(0);
  });

  it('POST /requirement-import/confirm forbids non-admin users', async () => {
    await request(app.getHttpServer())
      .post('/requirement-import/confirm')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ careerSubjectId, sections: [] })
      .expect(403);
  });

  it('POST /requirement-import/preview and /confirm require authentication', async () => {
    await request(app.getHttpServer())
      .post(`/requirement-import/preview?careerSubjectId=${careerSubjectId}`)
      .send({ html: SAMPLE_HTML })
      .expect(401);

    await request(app.getHttpServer())
      .post('/requirement-import/confirm')
      .send({ careerSubjectId, sections: [] })
      .expect(401);
  });
});
