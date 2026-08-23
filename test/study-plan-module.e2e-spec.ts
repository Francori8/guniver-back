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
} from './utils/e2e-setup';

describe('StudyPlanModule (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let studentToken: string;
  let university: University;
  let career: Career;

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

  it('POST /study-plan-modules is forbidden for a non-admin user', async () => {
    await request(app.getHttpServer())
      .post('/study-plan-modules')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ name: 'Ciclo Básico', careerId: career.id })
      .expect(403);
  });

  it('POST /study-plan-modules creates an obligatorio module by default', async () => {
    const response = await request(app.getHttpServer())
      .post('/study-plan-modules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ciclo Básico', careerId: career.id })
      .expect(201);

    expect(response.body.name).toBe('Ciclo Básico');
    expect(response.body.type).toBe('obligatorio');
    expect(response.body.career.id).toBe(career.id);
  });

  it('POST /study-plan-modules fails for optativo_por_creditos without requiredCredits', async () => {
    await request(app.getHttpServer())
      .post('/study-plan-modules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Núcleo de Orientación',
        careerId: career.id,
        type: 'optativo_por_creditos',
      })
      .expect(400);
  });

  it('POST /study-plan-modules creates optativo_por_creditos with requiredCredits', async () => {
    const response = await request(app.getHttpServer())
      .post('/study-plan-modules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Núcleo de Orientación',
        careerId: career.id,
        type: 'optativo_por_creditos',
        requiredCredits: 20,
      })
      .expect(201);

    expect(response.body.requiredCredits).toBe(20);
  });

  it('GET /study-plan-modules?careerId filters by career', async () => {
    const response = await request(app.getHttpServer())
      .get(`/study-plan-modules?careerId=${career.id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(
      response.body.every((m: any) => m.career.id === career.id),
    ).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(2);
  });

  it('DELETE /study-plan-modules/:id is blocked when a CareerSubject is assigned to it', async () => {
    const module = await request(app.getHttpServer())
      .post('/study-plan-modules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Módulo con materia', careerId: career.id })
      .expect(201);

    const subject = await seedSubject(app, { name: 'Álgebra I', career });

    const careerSubject = await request(app.getHttpServer())
      .get(`/career-subjects?careerId=${career.id}&subjectId=${subject.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .put(`/career-subjects/${careerSubject.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ moduleId: module.body.id })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/study-plan-modules/${module.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('DELETE /study-plan-modules/:id removes an unassigned module', async () => {
    const module = await request(app.getHttpServer())
      .post('/study-plan-modules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Módulo a borrar', careerId: career.id })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/study-plan-modules/${module.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/study-plan-modules/${module.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
