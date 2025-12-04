// src/modules/StudyMaterial/study_material.repository.ts
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';

import { BaseRepository } from 'src/shared/base-repository';
import { MaterialType, StudyMaterial } from './study_material.entity';

@Injectable()
export class StudyMaterialRepository extends BaseRepository<StudyMaterial> {
  constructor(em: EntityManager) {
    super(em, StudyMaterial);
  }

  async findBySubject(subjectId: number): Promise<StudyMaterial[]> {
    return this.find(
      { subject: subjectId },
      { populate: ['subject', 'uploadedBy'] },
    );
  }

  async findByTypeAndSubject(
    subjectId: number,
    type: MaterialType,
  ): Promise<StudyMaterial[]> {
    return this.find(
      { subject: subjectId, type },
      { populate: ['subject', 'uploadedBy'] },
    );
  }

  async findApprovedBySubject(subjectId: number): Promise<StudyMaterial[]> {
    return this.find(
      { subject: subjectId },
      { populate: ['subject', 'uploadedBy'] },
    );
  }

  async findByUploader(userId: number): Promise<StudyMaterial[]> {
    return this.find({ uploadedBy: userId }, { populate: ['subject'] });
  }

  async findPopular(limit: number = 10): Promise<StudyMaterial[]> {
    return this.find(
      {},
      {
        populate: ['subject', 'uploadedBy'],
        orderBy: { viewCount: 'DESC' },
        limit,
      },
    );
  }
}
