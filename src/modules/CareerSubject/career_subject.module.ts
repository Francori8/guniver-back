import { Module } from '@nestjs/common';

import { CareerSubjectService } from './career_subject.service';
import { CareerSubjectController } from './career_subject.controller';
import { CareerSubjectRepository } from './career_subject.repository';

import { StudyPlanModuleModule } from '../StudyPlanModule/study_plan_module.module';
import { AuditLogModule } from '../AuditLog/audit_log.module';

@Module({
  imports: [StudyPlanModuleModule, AuditLogModule],
  providers: [CareerSubjectService, CareerSubjectRepository],
  controllers: [CareerSubjectController],
  exports: [CareerSubjectRepository],
})
export class CareerSubjectModule {}
