import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { BaseRepository } from 'src/shared/base-repository';
import { RequirementGroup, RequirementKind } from './requirement_group.entity';

@Injectable()
export class RequirementGroupRepository extends BaseRepository<RequirementGroup> {
  constructor(em: EntityManager) {
    super(em, RequirementGroup);
  }

  async findByCareerSubjectAndKind(
    careerSubjectId: number,
    kind: RequirementKind,
  ): Promise<RequirementGroup | null> {
    return this.findOne(
      { careerSubject: { id: careerSubjectId }, kind },
      { populate: ['items', 'items.targetCareerSubject', 'items.targetModule'] },
    );
  }

  async findByCareerSubject(careerSubjectId: number): Promise<RequirementGroup[]> {
    return this.find(
      { careerSubject: { id: careerSubjectId } },
      { populate: ['items', 'items.targetCareerSubject', 'items.targetModule'] },
    );
  }

  async countByCareerSubject(careerSubjectId: number): Promise<number> {
    return this.count({ careerSubject: { id: careerSubjectId } });
  }

  async findByCareer(careerId: number): Promise<RequirementGroup[]> {
    return this.find(
      { careerSubject: { career: { id: careerId } } },
      {
        populate: [
          'careerSubject',
          'careerSubject.subject',
          'items',
          'items.targetCareerSubject',
          'items.targetCareerSubject.subject',
          'items.targetModule',
        ],
      },
    );
  }
}
