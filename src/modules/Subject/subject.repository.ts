// src/modules/Subject/subject.repository.ts
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Subject } from './subject.entity';
import { BaseRepository } from 'src/shared/base-repository';
import { CareerSubject } from '../CareerSubject/career_subject.entity';

@Injectable()
export class SubjectRepository extends BaseRepository<Subject> {
  constructor(em: EntityManager) {
    super(em, Subject);
  }

  async findByCareer(careerId: number): Promise<Subject[]> {
    const rows = await this.em.find(
      CareerSubject,
      { career: { id: careerId } },
      { populate: ['subject'] },
    );
    return rows.map((r) => r.subject);
  }

  async findSubjectsPaginated(
    page: number,
    limit: number,
    filters?: { careerId?: number; q?: string },
  ) {
    if (filters?.careerId) {
      const subjectIds = (
        await this.em.find(CareerSubject, { career: { id: filters.careerId } })
      ).map((r) => r.subject.id);

      const where: Record<string, any> = { id: { $in: subjectIds } };
      if (filters?.q) where.name = { $ilike: `%${filters.q}%` };

      return this.findPaginated(where, page, limit, {
        orderBy: { id: 'ASC' },
      });
    }

    const where: Record<string, any> = {};
    if (filters?.q) where.name = { $ilike: `%${filters.q}%` };

    return this.findPaginated(where, page, limit, {
      orderBy: { id: 'ASC' },
    });
  }

  async findByIdWithRelations(id: number): Promise<Subject | null> {
    return this.findOne({ id });
  }

  async searchByName(name: string): Promise<Subject[]> {
    return this.find({ name: { $ilike: `%${name}%` } });
  }

  async findCareerLinksBySubject(subjectId: number): Promise<CareerSubject[]> {
    return this.em.find(
      CareerSubject,
      { subject: { id: subjectId } },
      { populate: ['career'] },
    );
  }
}
