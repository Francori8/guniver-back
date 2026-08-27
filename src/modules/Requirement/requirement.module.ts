import { Module } from '@nestjs/common';

import { RequirementService } from './requirement.service';
import { RequirementController } from './requirement.controller';
import { RequirementGroupRepository } from './requirement_group.repository';
import { RequirementItemRepository } from './requirement_item.repository';

import { CareerSubjectModule } from '../CareerSubject/career_subject.module';
import { StudyPlanModuleModule } from '../StudyPlanModule/study_plan_module.module';
import { AuditLogModule } from '../AuditLog/audit_log.module';

@Module({
  imports: [CareerSubjectModule, StudyPlanModuleModule, AuditLogModule],
  providers: [RequirementService, RequirementGroupRepository, RequirementItemRepository],
  controllers: [RequirementController],
  exports: [RequirementService, RequirementGroupRepository, RequirementItemRepository],
})
export class RequirementModule {}
