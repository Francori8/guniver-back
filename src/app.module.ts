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

@Module({
  imports: [
    ConfigModule.forRoot(),
    MikroOrmModule.forRoot({ ...mikroOrmConfig, autoLoadEntities: true }),
    RoleModule,
    UserModule,
    UniversityModule,
    ProfileModule,
    AuthModule,
    CareerModule,
    SubjectModule,
    StudyMaterialModule,
  ],
})
export class AppModule {}
