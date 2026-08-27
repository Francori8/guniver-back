import { Module } from '@nestjs/common';

import { StudyPlanImportService } from './study_plan_import.service';
import { StudyPlanImportController } from './study_plan_import.controller';

import { CareerModule } from '../Career/career.module';
import { SubjectModule } from '../Subject/subject.module';
import { CareerSubjectModule } from '../CareerSubject/career_subject.module';
import { StudyPlanModuleModule } from '../StudyPlanModule/study_plan_module.module';

@Module({
  imports: [CareerModule, SubjectModule, CareerSubjectModule, StudyPlanModuleModule],
  providers: [StudyPlanImportService],
  controllers: [StudyPlanImportController],
})
export class StudyPlanImportModule {}
