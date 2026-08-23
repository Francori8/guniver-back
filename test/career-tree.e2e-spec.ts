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

describe('CareerTree (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let university: University;
  let career: Career;
  let algebraCareerSubjectId: number;
  let analisisCareerSubjectId: number;
  let fisicaCareerSubjectId: number;
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

    const module = await request(app.getHttpServer())
      .post('/study-plan-modules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ciclo Básico', careerId: career.id })
      .expect(201);
    moduleId = module.body.id;

    const algebra = await seedSubject(app, { name: 'Álgebra I', career });
    const analisis = await seedSubject(app, { name: 'Análisis I', career });
    const fisica = await seedSubject(app, { name: 'Física I', career });

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

    const fisicaCS = await request(app.getHttpServer())
      .get(`/career-subjects?careerId=${career.id}&subjectId=${fisica.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    fisicaCareerSubjectId = fisicaCS.body.id;

    await request(app.getHttpServer())
      .put(`/career-subjects/${fisicaCareerSubjectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ moduleId })
      .expect(200);

    // Análisis I requiere Álgebra I aprobada para cursar
    await request(app.getHttpServer())
      .put(`/career-subjects/${analisisCareerSubjectId}/requirements/cursar`)
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

    // Física I requiere 10 créditos del módulo para cursar, y el módulo completo para aprobar
    await request(app.getHttpServer())
      .put(`/career-subjects/${fisicaCareerSubjectId}/requirements/cursar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          { type: 'module_credits', targetModuleId: moduleId, requiredCredits: 10 },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/career-subjects/${fisicaCareerSubjectId}/requirements/aprobar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ type: 'module_complete', targetModuleId: moduleId }],
      })
      .expect(200);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('GET /careers/:careerId/tree without token returns 401', async () => {
    await request(app.getHttpServer())
      .get(`/careers/${career.id}/tree`)
      .expect(401);
  });

  it('GET /careers/:careerId/tree returns the career and 200', async () => {
    const response = await request(app.getHttpServer())
      .get(`/careers/${career.id}/tree`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.career.id).toBe(career.id);
  });

  it('modules contains the seeded module', async () => {
    const response = await request(app.getHttpServer())
      .get(`/careers/${career.id}/tree`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.modules).toHaveLength(1);
    expect(response.body.modules[0].id).toBe(moduleId);
    expect(response.body.modules[0].type).toBe('obligatorio');
  });

  it('subjects contains the 3 seeded subjects', async () => {
    const response = await request(app.getHttpServer())
      .get(`/careers/${career.id}/tree`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.subjects).toHaveLength(3);
  });

  it('Álgebra I has no requirements', async () => {
    const response = await request(app.getHttpServer())
      .get(`/careers/${career.id}/tree`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const algebra = response.body.subjects.find(
      (s: any) => s.id === algebraCareerSubjectId,
    );
    expect(algebra.requirements.cursar).toHaveLength(0);
    expect(algebra.requirements.aprobar).toHaveLength(0);
  });

  it('Análisis I requires Álgebra I approved to cursar', async () => {
    const response = await request(app.getHttpServer())
      .get(`/careers/${career.id}/tree`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const analisis = response.body.subjects.find(
      (s: any) => s.id === analisisCareerSubjectId,
    );
    expect(analisis.requirements.cursar).toHaveLength(1);
    expect(analisis.requirements.cursar[0].type).toBe('subject_approved');
    expect(analisis.requirements.cursar[0].targetCareerSubjectId).toBe(
      algebraCareerSubjectId,
    );
    expect(analisis.requirements.cursar[0].targetSubjectName).toBe('Álgebra I');
    expect(analisis.requirements.aprobar).toHaveLength(0);
  });

  it('Física I requires module credits to cursar and module complete to aprobar', async () => {
    const response = await request(app.getHttpServer())
      .get(`/careers/${career.id}/tree`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const fisica = response.body.subjects.find(
      (s: any) => s.id === fisicaCareerSubjectId,
    );
    expect(fisica.module.id).toBe(moduleId);

    expect(fisica.requirements.cursar).toHaveLength(1);
    expect(fisica.requirements.cursar[0].type).toBe('module_credits');
    expect(fisica.requirements.cursar[0].requiredCredits).toBe(10);
    expect(fisica.requirements.cursar[0].targetModuleId).toBe(moduleId);
    expect(fisica.requirements.cursar[0].targetModuleName).toBe('Ciclo Básico');

    expect(fisica.requirements.aprobar).toHaveLength(1);
    expect(fisica.requirements.aprobar[0].type).toBe('module_complete');
    expect(fisica.requirements.aprobar[0].targetModuleId).toBe(moduleId);
  });

  it('GET /careers/:careerId/tree returns 404 for a non-existent career', async () => {
    await request(app.getHttpServer())
      .get('/careers/999999/tree')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
