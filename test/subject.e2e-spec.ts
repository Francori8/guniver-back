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

describe('Subject (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let studentToken: string;
  let university: University;
  let career: Career;
  let career2: Career;

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
    career2 = await seedCareer(app, { name: 'Licenciatura en Matemática', university });

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

  it('POST /subjects is forbidden for a non-admin user', async () => {
    await request(app.getHttpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ name: 'Álgebra I', careerIds: [career.id] })
      .expect(403);
  });

  it('POST /subjects fails without careerIds', async () => {
    await request(app.getHttpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Álgebra I', careerIds: [] })
      .expect(400);
  });

  it('POST /subjects creates a subject linked to one or more careers', async () => {
    const response = await request(app.getHttpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Álgebra I', careerIds: [career.id, career2.id] })
      .expect(201);

    expect(response.body.name).toBe('Álgebra I');
    expect(response.body.careers.map((c: any) => c.id).sort()).toEqual(
      [career.id, career2.id].sort(),
    );
  });

  it('GET /subjects?careerId filters by career', async () => {
    const response = await request(app.getHttpServer())
      .get(`/subjects?careerId=${career.id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(
      response.body.every((s: any) =>
        s.careers.some((c: any) => c.id === career.id),
      ),
    ).toBe(true);
  });

  it('PUT /subjects/:id can change the linked careers', async () => {
    const created = await request(app.getHttpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Análisis Matemático I', careerIds: [career.id] })
      .expect(201);

    const response = await request(app.getHttpServer())
      .put(`/subjects/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ careerIds: [career2.id] })
      .expect(200);

    expect(response.body.careers.map((c: any) => c.id)).toEqual([career2.id]);
    expect(response.body.name).toBe('Análisis Matemático I');
  });

  it('DELETE /subjects/:id removes a subject for an admin', async () => {
    const created = await request(app.getHttpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Física I', careerIds: [career.id] })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/subjects/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/subjects/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
