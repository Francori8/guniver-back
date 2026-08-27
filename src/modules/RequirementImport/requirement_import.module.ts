import { Module } from '@nestjs/common';

import { RequirementImportService } from './requirement_import.service';
import { RequirementImportController } from './requirement_import.controller';

import { CareerSubjectModule } from '../CareerSubject/career_subject.module';
import { StudyPlanModuleModule } from '../StudyPlanModule/study_plan_module.module';
import { RequirementModule } from '../Requirement/requirement.module';

@Module({
  imports: [CareerSubjectModule, StudyPlanModuleModule, RequirementModule],
  providers: [RequirementImportService],
  controllers: [RequirementImportController],
})
export class RequirementImportModule {}
