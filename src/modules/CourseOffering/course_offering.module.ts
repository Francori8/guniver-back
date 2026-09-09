import { Module } from '@nestjs/common';

import { CourseOfferingService } from './course_offering.service';
import { CourseOfferingController } from './course_offering.controller';
import { CourseOfferingRepository } from './course_offering.repository';

import { CareerSubjectModule } from '../CareerSubject/career_subject.module';
import { CareerModule } from '../Career/career.module';

@Module({
  imports: [CareerSubjectModule, CareerModule],
  providers: [CourseOfferingService, CourseOfferingRepository],
  controllers: [CourseOfferingController],
  exports: [CourseOfferingRepository, CourseOfferingService],
})
export class CourseOfferingModule {}
