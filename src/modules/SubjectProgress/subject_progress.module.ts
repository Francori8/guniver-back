import { Module } from '@nestjs/common';

import { SubjectProgressService } from './subject_progress.service';
import { SubjectProgressController } from './subject_progress.controller';
import { SubjectProgressRepository } from './subject_progress.repository';

import { TermModule } from '../Term/term.module';
import { CareerSubjectModule } from '../CareerSubject/career_subject.module';

@Module({
  imports: [TermModule, CareerSubjectModule],
  providers: [SubjectProgressService, SubjectProgressRepository],
  controllers: [SubjectProgressController],
  exports: [SubjectProgressRepository, SubjectProgressService],
})
export class SubjectProgressModule {}
