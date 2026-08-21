import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { RoleName } from '../src/shared/Types/roles.enum';
import {
  createTestApp,
  closeTestApp,
  seedRole,
  seedUser,
  seedUniversity,
  seedCareer,
  seedSubject,
} from './utils/e2e-setup';

describe('StudyMaterial (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let studentToken: string;
  let subjectId: number;

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

    const university = await seedUniversity(app, { name: 'Universidad de Prueba', acronym: 'UP' });
    const career = await seedCareer(app, { name: 'Carrera de Prueba', university });
    const subject = await seedSubject(app, { name: 'Materia de Prueba', career });
    subjectId = subject.id;

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

  it('an admin creates a material that is approved and official immediately', async () => {
    const response = await request(app.getHttpServer())
      .post('/study-materials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Apunte oficial',
        subjectId,
        type: 'TEORICO',
        resourceUrl: 'https://example.com/apunte.pdf',
      })
      .expect(201);

    expect(response.body.status).toBe('approved');
    expect(response.body.isOfficial).toBe(true);
  });

  it('a student creates a material that is pending and not official', async () => {
    const response = await request(app.getHttpServer())
      .post('/study-materials')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Apunte de estudiante',
        subjectId,
        type: 'RESUMENES',
        resourceUrl: 'https://example.com/resumen.pdf',
      })
      .expect(201);

    expect(response.body.status).toBe('pending');
    expect(response.body.isOfficial).toBe(false);
  });

  it('a student does not see pending materials in the general listing', async () => {
    const response = await request(app.getHttpServer())
      .get(`/study-materials?subjectId=${subjectId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(response.body.every((m: any) => m.status === 'approved')).toBe(true);
  });

  it('an admin sees pending materials in the general listing', async () => {
    const response = await request(app.getHttpServer())
      .get(`/study-materials?subjectId=${subjectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.some((m: any) => m.status === 'pending')).toBe(true);
  });

  it('GET /study-materials/pending is forbidden for a student', async () => {
    await request(app.getHttpServer())
      .get('/study-materials/pending')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);
  });

  it('an admin can approve a pending material', async () => {
    const created = await request(app.getHttpServer())
      .post('/study-materials')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Apunte a aprobar',
        subjectId,
        type: 'PRACTICO',
        resourceUrl: 'https://example.com/practico.pdf',
      })
      .expect(201);

    const pending = await request(app.getHttpServer())
      .get('/study-materials/pending')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(pending.body.some((m: any) => m.id === created.body.id)).toBe(true);

    const approved = await request(app.getHttpServer())
      .patch(`/study-materials/${created.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(approved.body.status).toBe('approved');

    await request(app.getHttpServer())
      .patch(`/study-materials/${created.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('an admin can reject a pending material with a reason', async () => {
    const created = await request(app.getHttpServer())
      .post('/study-materials')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Apunte a rechazar',
        subjectId,
        type: 'PRACTICO',
        resourceUrl: 'https://example.com/rechazado.pdf',
      })
      .expect(201);

    const rejected = await request(app.getHttpServer())
      .patch(`/study-materials/${created.body.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Contenido duplicado' })
      .expect(200);

    expect(rejected.body.status).toBe('rejected');
    expect(rejected.body.rejectionReason).toBe('Contenido duplicado');
  });
});
