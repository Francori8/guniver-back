// src/modules/University/university.module.ts
import { Module } from '@nestjs/common';
import { StudentProfileRepository } from './repository/student_profile.repository';
import { AdminProfileRepository } from './repository/admin_profile.repository';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { CareerModule } from '../Career/career.module';
import { UserModule } from '../User/user.module';
import { UniversityModule } from '../University/university.module';

@Module({
  imports: [CareerModule, UserModule, UniversityModule],
  providers: [StudentProfileRepository, AdminProfileRepository, ProfileService],
  controllers: [ProfileController],
  exports: [StudentProfileRepository, AdminProfileRepository, ProfileService],
})
export class ProfileModule {}
