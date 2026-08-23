import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { BaseRepository } from 'src/shared/base-repository';
import { CareerSubject } from './career_subject.entity';

@Injectable()
export class CareerSubjectRepository extends BaseRepository<CareerSubject> {
  constructor(em: EntityManager) {
    super(em, CareerSubject);
  }

  async findByCareer(careerId: number): Promise<CareerSubject[]> {
    return this.find(
      { career: { id: careerId } },
      { populate: ['career', 'subject', 'module'] },
    );
  }

  async findByCareerAndSubject(
    careerId: number,
    subjectId: number,
  ): Promise<CareerSubject | null> {
    return this.findOne(
      { career: { id: careerId }, subject: { id: subjectId } },
      { populate: ['career', 'subject', 'module'] },
    );
  }

  async findBySubject(subjectId: number): Promise<CareerSubject[]> {
    return this.find(
      { subject: { id: subjectId } },
      { populate: ['career', 'subject', 'module'] },
    );
  }
}
