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

describe('Requirement (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let university: University;
  let career: Career;
  let algebraCareerSubjectId: number;
  let analisisCareerSubjectId: number;
  let moduleId: number;

  beforeAll(async () => {
    app = await createTestApp();

    const adminRole = await seedRole(app, RoleName.ADMIN);
    await seedUser(app, {
      email: 'admin@guniver.test',
      password: 'AdminPass123',
      firstName: 'Admin',
      lastName: 'User',
      role: adminRole,
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

    const algebra = await seedSubject(app, { name: 'Álgebra I', career });
    const analisis = await seedSubject(app, { name: 'Análisis I', career });

    const algebraCS = await request(app.getHttpServer())
      .get(`/career-subjects?careerId=${career.id}&subjectId=${algebra.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    algebraCareerSubjectId = algebraCS.body.id;

    const analisisCS = await request(app.getHttpServer())
      .get(`/career-subjects?careerId=${career.id}&subjectId=${analisis.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    analisisCareerSubjectId = analisisCS.body.id;

    const module = await request(app.getHttpServer())
      .post('/study-plan-modules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ciclo Básico', careerId: career.id })
      .expect(201);
    moduleId = module.body.id;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('PUT .../requirements/:kind rejects an invalid kind', async () => {
    await request(app.getHttpServer())
      .put(`/career-subjects/${analisisCareerSubjectId}/requirements/invalid`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ items: [] })
      .expect(400);
  });

  it('PUT .../requirements/:kind validates required fields per item type', async () => {
    await request(app.getHttpServer())
      .put(`/career-subjects/${analisisCareerSubjectId}/requirements/cursar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ items: [{ type: 'subject_approved' }] })
      .expect(400);

    await request(app.getHttpServer())
      .put(`/career-subjects/${analisisCareerSubjectId}/requirements/cursar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ items: [{ type: 'module_credits', targetModuleId: moduleId }] })
      .expect(400);

    await request(app.getHttpServer())
      .put(`/career-subjects/${analisisCareerSubjectId}/requirements/cursar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ items: [{ type: 'module_complete' }] })
      .expect(400);
  });

  it('PUT .../requirements/cursar saves the 3 item types independently of aprobar', async () => {
    const cursarResponse = await request(app.getHttpServer())
      .put(`/career-subjects/${analisisCareerSubjectId}/requirements/cursar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            type: 'subject_approved',
            targetCareerSubjectId: algebraCareerSubjectId,
          },
          { type: 'module_credits', targetModuleId: moduleId, requiredCredits: 10 },
          { type: 'module_complete', targetModuleId: moduleId },
        ],
      })
      .expect(200);

    expect(cursarResponse.body.items).toHaveLength(3);

    const getResponse = await request(app.getHttpServer())
      .get(`/career-subjects/${analisisCareerSubjectId}/requirements`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(getResponse.body.cursar.items).toHaveLength(3);
    expect(getResponse.body.aprobar.items).toHaveLength(0);
  });

  it('PUT .../requirements/aprobar does not affect cursar (independent kinds)', async () => {
    await request(app.getHttpServer())
      .put(`/career-subjects/${analisisCareerSubjectId}/requirements/aprobar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            type: 'subject_approved',
            targetCareerSubjectId: algebraCareerSubjectId,
          },
        ],
      })
      .expect(200);

    const getResponse = await request(app.getHttpServer())
      .get(`/career-subjects/${analisisCareerSubjectId}/requirements`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(getResponse.body.cursar.items).toHaveLength(3);
    expect(getResponse.body.aprobar.items).toHaveLength(1);
  });

  it('PUT .../requirements/:kind is a total replacement, leaving no orphans', async () => {
    const replaceResponse = await request(app.getHttpServer())
      .put(`/career-subjects/${analisisCareerSubjectId}/requirements/cursar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ type: 'module_complete', targetModuleId: moduleId }],
      })
      .expect(200);

    expect(replaceResponse.body.items).toHaveLength(1);

    const getResponse = await request(app.getHttpServer())
      .get(`/career-subjects/${analisisCareerSubjectId}/requirements`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(getResponse.body.cursar.items).toHaveLength(1);
    expect(getResponse.body.cursar.items[0].type).toBe('module_complete');
    expect(getResponse.body.aprobar.items).toHaveLength(1);
  });
});
