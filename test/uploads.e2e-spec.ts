import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { RoleName } from '../src/shared/Types/roles.enum';
import { CloudinaryService } from '../src/modules/Uploads/cloudinary.service';
import { createTestApp, closeTestApp, seedRole, seedUser } from './utils/e2e-setup';

describe('Uploads (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let studentToken: string;

  beforeAll(async () => {
    app = await createTestApp((builder) => {
      // Cloudinary requiere credenciales reales de red; se mockea acá y se
      // testea solo la lógica de validación (tamaño/extensión por rol) que
      // corre antes de llegar al servicio real.
      builder.overrideProvider(CloudinaryService).useValue({
        uploadBuffer: async (buffer: Buffer, filename: string) => ({
          url: `https://cloudinary.test/${filename}`,
          publicId: `test-${filename}`,
          resourceType: 'raw',
        }),
        destroy: async () => {},
      });
    });

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

  it('POST /uploads requires authentication', async () => {
    await request(app.getHttpServer())
      .post('/uploads')
      .attach('file', Buffer.from('hola'), 'apunte.pdf')
      .expect(401);
  });

  it('POST /uploads rejects when no file is sent', async () => {
    await request(app.getHttpServer())
      .post('/uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('an admin can upload a file with any allowed extension, up to 20MB', async () => {
    const response = await request(app.getHttpServer())
      .post('/uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('contenido de prueba'), 'ejecutable.exe')
      .expect(201);

    expect(response.body.url).toContain('ejecutable.exe');
  });

  it('a student can upload an allowed extension within the size limit', async () => {
    const response = await request(app.getHttpServer())
      .post('/uploads')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('file', Buffer.from('contenido de prueba'), 'apunte.pdf')
      .expect(201);

    expect(response.body.url).toContain('apunte.pdf');
  });

  it('a student cannot upload a disallowed extension', async () => {
    const response = await request(app.getHttpServer())
      .post('/uploads')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('file', Buffer.from('contenido de prueba'), 'ejecutable.exe')
      .expect(400);

    expect(response.body.message).toContain('Extensión no permitida');
  });

  it('a student cannot upload a file over 10MB', async () => {
    const oversized = Buffer.alloc(11 * 1024 * 1024);

    const response = await request(app.getHttpServer())
      .post('/uploads')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('file', oversized, 'apunte-grande.pdf')
      .expect(400);

    expect(response.body.message).toContain('supera el límite');
  });
});
