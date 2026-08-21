import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { RoleName } from '../src/shared/Types/roles.enum';
import { createTestApp, closeTestApp, seedRole, seedUser } from './utils/e2e-setup';

describe('AuditLog (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let studentToken: string;
  let adminRole: Awaited<ReturnType<typeof seedRole>>;
  let studentRole: Awaited<ReturnType<typeof seedRole>>;

  beforeAll(async () => {
    app = await createTestApp();

    adminRole = await seedRole(app, RoleName.ADMIN);
    studentRole = await seedRole(app, RoleName.STUDENT);

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

  it('GET /audit-logs is forbidden for a non-admin user', async () => {
    await request(app.getHttpServer())
      .get('/audit-logs')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);
  });

  it('creating a university registers a CREATE audit log entry', async () => {
    const created = await request(app.getHttpServer())
      .post('/universities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Universidad Auditada', acronym: 'UA' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const entry = response.body.data.find(
      (log: any) => log.entityType === 'University' && log.entityId === created.body.id,
    );
    expect(entry).toBeDefined();
    expect(entry.action).toBe('CREATE');
    expect(entry.actor.email).toBe('admin@guniver.test');
  });

  it('changing a user role registers a ROLE_CHANGE audit log entry', async () => {
    const created = await seedUser(app, {
      email: 'promote-me@guniver.test',
      password: 'Password123',
      firstName: 'Promote',
      lastName: 'Me',
      role: studentRole,
    });

    await request(app.getHttpServer())
      .put(`/users/${created.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleId: adminRole.id })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const entry = response.body.data.find(
      (log: any) => log.entityType === 'User' && log.entityId === created.id,
    );
    expect(entry).toBeDefined();
    expect(entry.action).toBe('ROLE_CHANGE');
    expect(entry.metadata).toEqual({ from: RoleName.STUDENT, to: RoleName.ADMIN });
  });
});
