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
  seedStudentProfile,
} from './utils/e2e-setup';

describe('AcademicHistory (e2e)', () => {
  let app: INestApplication<App>;
  let studentToken: string;
  let noProfileStudentToken: string;
  let career: Career;

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
    await seedUser(app, {
      email: 'noprofile@guniver.test',
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
    await seedStudentProfile(app, { user: student, university, career });

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'student@guniver.test', password: 'StudentPass123' })
      .expect(201);
    studentToken = login.body.access_token;

    const noProfileLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'noprofile@guniver.test', password: 'StudentPass123' })
      .expect(201);
    noProfileStudentToken = noProfileLogin.body.access_token;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('POST /academic-history/preview without a file returns 400', async () => {
    await request(app.getHttpServer())
      .post('/academic-history/preview')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(400);
  });

  it('POST /academic-history/preview rejects a non-PDF file', async () => {
    await request(app.getHttpServer())
      .post('/academic-history/preview')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('file', Buffer.from('no soy un pdf'), {
        filename: 'historia.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  it('POST /academic-history/preview returns 404 for a student without any profile', async () => {
    await request(app.getHttpServer())
      .post('/academic-history/preview')
      .set('Authorization', `Bearer ${noProfileStudentToken}`)
      .attach('file', Buffer.from('%PDF-1.4 fake'), {
        filename: 'historia.pdf',
        contentType: 'application/pdf',
      })
      .expect(404);
  });

  it('POST /academic-history/confirm with no term groups creates nothing', async () => {
    const response = await request(app.getHttpServer())
      .post('/academic-history/confirm')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ termGroups: [] })
      .expect(201);

    expect(response.body.created).toBe(0);
    expect(response.body.skipped).toBe(0);
    expect(response.body.errors).toHaveLength(0);
  });

  it('POST /academic-history/preview and /confirm require authentication', async () => {
    await request(app.getHttpServer())
      .post('/academic-history/preview')
      .attach('file', Buffer.from('%PDF-1.4 fake'), {
        filename: 'historia.pdf',
        contentType: 'application/pdf',
      })
      .expect(401);

    await request(app.getHttpServer())
      .post('/academic-history/confirm')
      .send({ termGroups: [] })
      .expect(401);
  });
});
