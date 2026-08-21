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

  async findSubjectsPaginated(
    page: number,
    limit: number,
    filters?: { careerId?: number; q?: string },
  ) {
    const where: Record<string, any> = {};
    if (filters?.careerId) where.careers = filters.careerId;
    if (filters?.q) where.name = { $ilike: `%${filters.q}%` };

    return this.findPaginated(where, page, limit, {
      populate: ['careers'],
      orderBy: { id: 'ASC' },
    });
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
