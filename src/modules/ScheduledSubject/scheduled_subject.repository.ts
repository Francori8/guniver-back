import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { BaseRepository } from 'src/shared/base-repository';
import { ScheduledSubject } from './scheduled_subject.entity';

@Injectable()
export class ScheduledSubjectRepository extends BaseRepository<ScheduledSubject> {
  constructor(em: EntityManager) {
    super(em, ScheduledSubject);
  }

  async findByTerm(termId: number): Promise<ScheduledSubject[]> {
    return this.find(
      { term: termId },
      { populate: ['careerSubject', 'careerSubject.subject', 'slots'] },
    );
  }

  async findByTermAndCareerSubject(
    termId: number,
    careerSubjectId: number,
  ): Promise<ScheduledSubject | null> {
    return this.findOne({ term: termId, careerSubject: careerSubjectId });
  }

  async findByTerms(termIds: number[]): Promise<ScheduledSubject[]> {
    return this.find(
      { term: { $in: termIds } },
      { populate: ['term', 'careerSubject', 'careerSubject.subject', 'slots'] },
    );
  }
}
