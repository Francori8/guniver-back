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
      { subject: subjectId, deletedAt: null },
      { populate: ['subject', 'uploadedBy'], orderBy: { type: 'ASC', order: 'ASC' } },
    );
  }

  async findByTypeAndSubject(
    subjectId: number,
    type: MaterialType,
  ): Promise<StudyMaterial[]> {
    return this.find(
      { subject: subjectId, type, deletedAt: null },
      { populate: ['subject', 'uploadedBy'], orderBy: { order: 'ASC' } },
    );
  }

  async findApprovedBySubject(subjectId: number): Promise<StudyMaterial[]> {
    return this.find(
      { subject: subjectId, deletedAt: null },
      { populate: ['subject', 'uploadedBy'], orderBy: { type: 'ASC', order: 'ASC' } },
    );
  }

  async findByUploader(userId: number): Promise<StudyMaterial[]> {
    return this.find(
      { uploadedBy: userId, deletedAt: null },
      { populate: ['subject'] },
    );
  }

  async findPopular(limit: number = 10): Promise<StudyMaterial[]> {
    return this.find(
      { deletedAt: null },
      {
        populate: ['subject', 'uploadedBy'],
        orderBy: { viewCount: 'DESC' },
        limit,
      },
    );
  }

  async findTrash(): Promise<StudyMaterial[]> {
    return this.find(
      { deletedAt: { $ne: null } },
      { populate: ['subject', 'uploadedBy'], orderBy: { deletedAt: 'desc' } },
    );
  }

  async getNextOrder(subjectId: number, type: MaterialType): Promise<number> {
    const last = await this.findOne(
      { subject: subjectId, type },
      { orderBy: { order: 'DESC' } },
    );
    return last ? last.order + 1 : 0;
  }
}
