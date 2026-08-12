import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { RoleName } from '../src/shared/Types/roles.enum';
import { Role } from '../src/modules/Role/role.entity';
import {
  createTestApp,
  closeTestApp,
  seedRole,
  seedUser,
} from './utils/e2e-setup';

describe('User (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let studentToken: string;
  let studentRole: Role;

  beforeAll(async () => {
    app = await createTestApp();

    const adminRole = await seedRole(app, RoleName.ADMIN);
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

  it('POST /users requires authentication', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'nuevo@example.com',
        password: 'Password123',
        firstName: 'Nuevo',
        lastName: 'Usuario',
        roleId: studentRole.id,
      })
      .expect(401);
  });

  it('POST /users is forbidden for a non-admin user', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        email: 'nuevo@example.com',
        password: 'Password123',
        firstName: 'Nuevo',
        lastName: 'Usuario',
        roleId: studentRole.id,
      })
      .expect(403);
  });

  it('POST /users creates a user for an admin', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'nuevo@example.com',
        password: 'Password123',
        firstName: 'Nuevo',
        lastName: 'Usuario',
        roleId: studentRole.id,
      })
      .expect(201);

    expect(response.body.email).toBe('nuevo@example.com');
    expect(response.body.role.id).toBe(studentRole.id);
  });

  it('POST /users fails with a non-existent roleId', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'otro@example.com',
        password: 'Password123',
        firstName: 'Otro',
        lastName: 'Usuario',
        roleId: 999999,
      })
      .expect(404);
  });

  it('GET /users lists all users for an authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(
      response.body.some((u: any) => u.email === 'nuevo@example.com'),
    ).toBe(true);
  });

  it('GET /users/:id returns a user by id', async () => {
    const created = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'consulta@example.com',
        password: 'Password123',
        firstName: 'Consulta',
        lastName: 'Usuario',
        roleId: studentRole.id,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/users/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.email).toBe('consulta@example.com');
  });

  it('PUT /users/:id updates a user', async () => {
    const created = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'actualizar@example.com',
        password: 'Password123',
        firstName: 'Original',
        lastName: 'Usuario',
        roleId: studentRole.id,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .put(`/users/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: 'Actualizado' })
      .expect(200);

    expect(response.body.firstName).toBe('Actualizado');
  });

  it('DELETE /users/:id is forbidden for a non-admin user', async () => {
    const created = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'borrar1@example.com',
        password: 'Password123',
        firstName: 'Borrar',
        lastName: 'Usuario',
        roleId: studentRole.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/users/${created.body.id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);
  });

  it('DELETE /users/:id deletes a user for an admin', async () => {
    const created = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'borrar2@example.com',
        password: 'Password123',
        firstName: 'Borrar',
        lastName: 'Usuario',
        roleId: studentRole.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/users/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/users/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
