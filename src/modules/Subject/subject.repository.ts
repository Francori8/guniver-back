// src/modules/Subject/subject.repository.ts
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Subject } from './subject.entity';
import { BaseRepository } from 'src/shared/base-repository';

@Injectable()
export class SubjectRepository extends BaseRepository<Subject> {
  constructor(em: EntityManager) {
    super(em, Subject);
  }

  async findByCareer(careerId: number): Promise<Subject[]> {
    return this.find({ careers: careerId }, { populate: ['careers'] });
  }

  async findByIdWithRelations(id: number): Promise<Subject | null> {
    return this.findOne({ id }, { populate: ['careers'] });
  }

  async searchByName(name: string): Promise<Subject[]> {
    return this.find(
      { name: { $ilike: `%${name}%` } },
      { populate: ['careers'] },
    );
  }
}
