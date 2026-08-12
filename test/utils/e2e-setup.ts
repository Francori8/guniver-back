import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { RoleName } from '../../src/shared/Types/roles.enum';
import { Role } from '../../src/modules/Role/role.entity';
import { User } from '../../src/modules/User/user.entity';
import { University } from '../../src/modules/University/university.entity';
import { Career } from '../../src/modules/Career/career.entity';

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  await app.init();

  const orm = app.get(MikroORM);
  await orm.getSchemaGenerator().refreshDatabase();

  return app;
}

export async function closeTestApp(app: INestApplication): Promise<void> {
  const orm = app.get(MikroORM);
  await orm.close(true);
  await app.close();
}

function forkEm(app: INestApplication) {
  return app.get(MikroORM).em.fork();
}

export async function seedRole(
  app: INestApplication,
  name: RoleName,
): Promise<Role> {
  const em = forkEm(app);
  const role = em.create(Role, { name } as any);
  await em.persistAndFlush(role);
  return role;
}

export async function seedUser(
  app: INestApplication,
  params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: Role;
    isActive?: boolean;
  },
) {
  const em = forkEm(app);
  const hashedPassword = await bcrypt.hash(params.password, 10);
  const user = em.create(User, {
    email: params.email,
    password: hashedPassword,
    firstName: params.firstName,
    lastName: params.lastName,
    role: params.role,
    isActive: params.isActive ?? true,
  } as any);
  await em.persistAndFlush(user);
  return user;
}

export async function seedUniversity(
  app: INestApplication,
  params: { name: string; acronym: string },
): Promise<University> {
  const em = forkEm(app);
  const university = em.create(University, params as any);
  await em.persistAndFlush(university);
  return university;
}

export async function seedCareer(
  app: INestApplication,
  params: { name: string; university: University },
): Promise<Career> {
  const em = forkEm(app);
  const career = em.create(Career, params as any);
  await em.persistAndFlush(career);
  return career;
}
