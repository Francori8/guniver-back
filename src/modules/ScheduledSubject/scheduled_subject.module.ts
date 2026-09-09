import { Module } from '@nestjs/common';

import { ScheduledSubjectService } from './scheduled_subject.service';
import {
  ScheduledSubjectController,
  ScheduledSubjectQueryController,
} from './scheduled_subject.controller';
import { ScheduledSubjectRepository } from './scheduled_subject.repository';

import { TermModule } from '../Term/term.module';
import { CareerSubjectModule } from '../CareerSubject/career_subject.module';

@Module({
  imports: [TermModule, CareerSubjectModule],
  providers: [ScheduledSubjectService, ScheduledSubjectRepository],
  controllers: [ScheduledSubjectController, ScheduledSubjectQueryController],
  exports: [ScheduledSubjectRepository, ScheduledSubjectService],
})
export class ScheduledSubjectModule {}
