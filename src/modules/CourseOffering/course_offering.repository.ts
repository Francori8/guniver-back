import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { BaseRepository } from 'src/shared/base-repository';
import { CourseOffering } from './course_offering.entity';
import { TermPeriod } from '../Term/term.entity';

@Injectable()
export class CourseOfferingRepository extends BaseRepository<CourseOffering> {
  constructor(em: EntityManager) {
    super(em, CourseOffering);
  }

  async findByCareerSubject(
    careerSubjectId: number,
    year: number,
    period: TermPeriod,
  ): Promise<CourseOffering[]> {
    return this.find(
      { careerSubject: careerSubjectId, year, period },
      { populate: ['slots'] },
    );
  }

  async findByCareer(
    careerId: number,
    year: number,
    period: TermPeriod,
  ): Promise<CourseOffering[]> {
    return this.find(
      { careerSubject: { career: careerId }, year, period },
      { populate: ['careerSubject', 'careerSubject.subject', 'slots'] },
    );
  }
}
