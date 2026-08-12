// src/app.module.ts
import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { RoleModule } from './modules/Role/role.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './modules/User/user.module';

import mikroOrmConfig from 'mikro-orm.config';
import { AuthModule } from './modules/Auth/auth.module';
import { CareerModule } from './modules/Career/career.module';
import { UniversityModule } from './modules/University/university.module';
import { ProfileModule } from './modules/Profile/profile.module';
import { SubjectModule } from './modules/Subject/subject.module';
import { StudyMaterialModule } from './modules/StudyMaterial/study_material.module';
import { AccessRequestModule } from './modules/AccessRequest/access_request.module';
import { MailModule } from './modules/Mail/mail.module';
import { UploadsModule } from './modules/Uploads/uploads.module';
import { PublicModule } from './modules/Public/public.module';
import { CareerRequestModule } from './modules/CareerRequest/career_request.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    MikroOrmModule.forRoot({ ...mikroOrmConfig, autoLoadEntities: true }),
    RoleModule,
    UserModule,
    UniversityModule,
    ProfileModule,
    AuthModule,
    CareerModule,
    SubjectModule,
    StudyMaterialModule,
    MailModule,
    AccessRequestModule,
    UploadsModule,
    PublicModule,
    CareerRequestModule,
  ],
})
export class AppModule {}
