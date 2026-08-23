import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { BaseRepository } from 'src/shared/base-repository';
import { StudyPlanModule } from './study_plan_module.entity';

@Injectable()
export class StudyPlanModuleRepository extends BaseRepository<StudyPlanModule> {
  constructor(em: EntityManager) {
    super(em, StudyPlanModule);
  }

  async findByCareer(careerId: number): Promise<StudyPlanModule[]> {
    return this.find(
      { career: { id: careerId } },
      { populate: ['career'], orderBy: { order: 'ASC' } },
    );
  }
}
