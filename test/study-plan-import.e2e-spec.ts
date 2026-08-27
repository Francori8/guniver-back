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
} from './utils/e2e-setup';

describe('StudyPlanImport (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let studentToken: string;
  let career: Career;

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

  it('POST /study-plan-import/preview without a file returns 400', async () => {
    await request(app.getHttpServer())
      .post(`/study-plan-import/preview?careerId=${career.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('POST /study-plan-import/preview rejects a non-Excel file', async () => {
    await request(app.getHttpServer())
      .post(`/study-plan-import/preview?careerId=${career.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('no soy un pdf'), {
        filename: 'plan.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  it('POST /study-plan-import/preview returns 404 for an unknown career', async () => {
    await request(app.getHttpServer())
      .post('/study-plan-import/preview?careerId=999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('fake excel content'), {
        filename: 'plan.xls',
        contentType: 'application/vnd.ms-excel',
      })
      .expect(404);
  });

  it('POST /study-plan-import/preview forbids non-admin users', async () => {
    await request(app.getHttpServer())
      .post(`/study-plan-import/preview?careerId=${career.id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('file', Buffer.from('fake excel content'), {
        filename: 'plan.xls',
        contentType: 'application/vnd.ms-excel',
      })
      .expect(403);
  });

  it('POST /study-plan-import/confirm with no sections creates nothing', async () => {
    const response = await request(app.getHttpServer())
      .post('/study-plan-import/confirm')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ careerId: career.id, sections: [] })
      .expect(201);

    expect(response.body.subjectsCreated).toBe(0);
    expect(response.body.careerSubjectsCreated).toBe(0);
    expect(response.body.errors).toHaveLength(0);
  });

  it('POST /study-plan-import/confirm forbids non-admin users', async () => {
    await request(app.getHttpServer())
      .post('/study-plan-import/confirm')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ careerId: career.id, sections: [] })
      .expect(403);
  });

  it('POST /study-plan-import/preview and /confirm require authentication', async () => {
    await request(app.getHttpServer())
      .post(`/study-plan-import/preview?careerId=${career.id}`)
      .attach('file', Buffer.from('fake excel content'), {
        filename: 'plan.xls',
        contentType: 'application/vnd.ms-excel',
      })
      .expect(401);

    await request(app.getHttpServer())
      .post('/study-plan-import/confirm')
      .send({ careerId: career.id, sections: [] })
      .expect(401);
  });
});
