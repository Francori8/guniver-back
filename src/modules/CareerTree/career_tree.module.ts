import { Module } from '@nestjs/common';

import { CareerTreeService } from './career_tree.service';
import { CareerTreeController } from './career_tree.controller';

import { CareerModule } from '../Career/career.module';
import { StudyPlanModuleModule } from '../StudyPlanModule/study_plan_module.module';
import { CareerSubjectModule } from '../CareerSubject/career_subject.module';
import { RequirementModule } from '../Requirement/requirement.module';

@Module({
  imports: [CareerModule, StudyPlanModuleModule, CareerSubjectModule, RequirementModule],
  providers: [CareerTreeService],
  controllers: [CareerTreeController],
})
export class CareerTreeModule {}
