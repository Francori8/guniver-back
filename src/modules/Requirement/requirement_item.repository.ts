import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { BaseRepository } from 'src/shared/base-repository';
import { RequirementItem } from './requirement_item.entity';

@Injectable()
export class RequirementItemRepository extends BaseRepository<RequirementItem> {
  constructor(em: EntityManager) {
    super(em, RequirementItem);
  }

  async countByTargetCareerSubject(careerSubjectId: number): Promise<number> {
    return this.count({ targetCareerSubject: { id: careerSubjectId } });
  }
}
