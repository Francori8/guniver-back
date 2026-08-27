import { Module } from '@nestjs/common';

import { StudentProgressEvaluationService } from './student_progress_evaluation.service';
import { StudentProgressController } from './student_progress.controller';

import { CareerTreeModule } from '../CareerTree/career_tree.module';
import { RequirementModule } from '../Requirement/requirement.module';
import { ProfileModule } from '../Profile/profile.module';
import { SubjectProgressModule } from '../SubjectProgress/subject_progress.module';

@Module({
  imports: [CareerTreeModule, RequirementModule, ProfileModule, SubjectProgressModule],
  providers: [StudentProgressEvaluationService],
  controllers: [StudentProgressController],
  exports: [StudentProgressEvaluationService],
})
export class StudentProgressModule {}
