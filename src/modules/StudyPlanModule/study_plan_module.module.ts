import { Module } from '@nestjs/common';

import { StudyPlanModuleService } from './study_plan_module.service';
import { StudyPlanModuleController } from './study_plan_module.controller';
import { StudyPlanModuleRepository } from './study_plan_module.repository';

import { CareerModule } from '../Career/career.module';
import { AuditLogModule } from '../AuditLog/audit_log.module';

@Module({
  imports: [CareerModule, AuditLogModule],
  providers: [StudyPlanModuleService, StudyPlanModuleRepository],
  controllers: [StudyPlanModuleController],
  exports: [StudyPlanModuleRepository],
})
export class StudyPlanModuleModule {}
