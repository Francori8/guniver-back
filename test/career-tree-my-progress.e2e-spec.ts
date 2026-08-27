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

describe('CareerTree my-progress (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let studentToken: string;
  let career: Career;
  let algebraCareerSubjectId: number;
  let analisisCareerSubjectId: number;
  let fisicaCareerSubjectId: number;
  let moduleId: number;

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
    const student = await seedUser(app, {
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
    await seedStudentProfile(app, { user: student, university, career });

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

    const module = await request(app.getHttpServer())
      .post('/study-plan-modules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ciclo Básico', careerId: career.id })
      .expect(201);
    moduleId = module.body.id;

    await request(app.getHttpServer())
      .put(`/career-subjects/${fisicaCareerSubjectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ moduleId })
      .expect(200);
    await request(app.getHttpServer())
      .put(`/career-subjects/${algebraCareerSubjectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ moduleId })
      .expect(200);

    // Análisis I requiere Álgebra I aprobada para cursar
    await request(app.getHttpServer())
      .put(`/career-subjects/${analisisCareerSubjectId}/requirements/cursar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ type: 'subject_approved', targetCareerSubjectId: algebraCareerSubjectId }],
      })
      .expect(200);

    // Física I requiere 10 créditos del módulo para cursar, y el módulo completo para aprobar
    await request(app.getHttpServer())
      .put(`/career-subjects/${fisicaCareerSubjectId}/requirements/cursar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ type: 'module_credits', targetModuleId: moduleId, requiredCredits: 10 }],
      })
      .expect(200);
    await request(app.getHttpServer())
      .put(`/career-subjects/${fisicaCareerSubjectId}/requirements/aprobar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ items: [{ type: 'module_complete', targetModuleId: moduleId }] })
      .expect(200);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('returns 404 for a student without a profile in that career', async () => {
    const otherStudentRole = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@guniver.test', password: 'AdminPass123' })
      .expect(201);
    // el admin no tiene StudentProfile en esta carrera
    await request(app.getHttpServer())
      .get(`/careers/${career.id}/tree/my-progress`)
      .set('Authorization', `Bearer ${otherStudentRole.body.access_token}`)
      .expect(404);
  });

  it('subject_approved requires exactly "aprobada", not "cursada"', async () => {
    const term = await request(app.getHttpServer())
      .post('/terms')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ careerId: career.id, year: 2023, period: 'first' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/terms/${term.body.id}/subject-progress`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ careerSubjectId: algebraCareerSubjectId, status: 'cursada' })
      .expect(201);

    const tree = await request(app.getHttpServer())
      .get(`/careers/${career.id}/tree/my-progress`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    const analisis = tree.body.subjects.find((s: any) => s.id === analisisCareerSubjectId);
    expect(analisis.progress.enabledToCursar).toBe(false);
  });

  it('becomes enabled once the correlativa reaches "aprobada"', async () => {
    const algebraProgress = await request(app.getHttpServer())
      .get(`/careers/${career.id}/tree/my-progress`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    const algebra = algebraProgress.body.subjects.find(
      (s: any) => s.id === algebraCareerSubjectId,
    );
    // localizar el subject-progress creado para actualizarlo a aprobada
    const term = await request(app.getHttpServer())
      .get(`/terms?careerId=${career.id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    const termDetail = await request(app.getHttpServer())
      .get(`/terms/${term.body[0].id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(algebra.progress.status).toBe('cursada');

    // No hay endpoint de detalle con subjectProgress listado en este plan v1; en su
    // lugar creamos un nuevo term con Álgebra ya aprobada para simular el avance.
    const term2 = await request(app.getHttpServer())
      .post('/terms')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ careerId: career.id, year: 2023, period: 'second' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/terms/${term2.body.id}/subject-progress`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ careerSubjectId: algebraCareerSubjectId, status: 'aprobada', grade: 8 })
      .expect(201);

    const treeAfter = await request(app.getHttpServer())
      .get(`/careers/${career.id}/tree/my-progress`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    const analisisAfter = treeAfter.body.subjects.find(
      (s: any) => s.id === analisisCareerSubjectId,
    );
    // El registro más reciente (2023-second, aprobada) debe prevalecer sobre el de
    // 2023-first (cursada) para la misma careerSubject.
    expect(analisisAfter.progress.enabledToCursar).toBe(true);

    const algebraAfter = treeAfter.body.subjects.find(
      (s: any) => s.id === algebraCareerSubjectId,
    );
    expect(algebraAfter.progress.status).toBe('aprobada');
  });

  it('module_credits and module_complete evaluate against approved credits/subjects of the module', async () => {
    const tree = await request(app.getHttpServer())
      .get(`/careers/${career.id}/tree/my-progress`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    // Álgebra I (créditos 0 por seedSubject) ya está aprobada, pero Física I pide 10
    // créditos del módulo — con 0 créditos aprobados no alcanza.
    const fisica = tree.body.subjects.find((s: any) => s.id === fisicaCareerSubjectId);
    expect(fisica.progress.enabledToCursar).toBe(false);

    // module_complete pide TODAS las materias obligatorias del módulo en aprobada;
    // Física I mismo está en el módulo, así que nunca puede auto-habilitarse a sí
    // misma completa, pero esto confirma que sin completar el módulo no habilita.
    expect(fisica.progress.enabledToAprobar).toBe(false);
  });
});
