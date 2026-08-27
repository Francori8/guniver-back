import { Module } from '@nestjs/common';

import { AcademicHistoryService } from './academic_history.service';
import { AcademicHistoryController } from './academic_history.controller';

import { TermModule } from '../Term/term.module';
import { SubjectProgressModule } from '../SubjectProgress/subject_progress.module';
import { CareerSubjectModule } from '../CareerSubject/career_subject.module';
import { ProfileModule } from '../Profile/profile.module';

@Module({
  imports: [TermModule, SubjectProgressModule, CareerSubjectModule, ProfileModule],
  providers: [AcademicHistoryService],
  controllers: [AcademicHistoryController],
})
export class AcademicHistoryModule {}
