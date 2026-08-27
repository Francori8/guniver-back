import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { BaseRepository } from 'src/shared/base-repository';
import { Term } from './term.entity';

@Injectable()
export class TermRepository extends BaseRepository<Term> {
  constructor(em: EntityManager) {
    super(em, Term);
  }

  async findByStudentProfile(studentProfileId: number): Promise<Term[]> {
    return this.find(
      { studentProfile: studentProfileId },
      { populate: ['studentProfile'], orderBy: { year: 'DESC', period: 'DESC' } },
    );
  }

  async findByIdWithRelations(id: number): Promise<Term | null> {
    return this.findOne(
      { id },
      { populate: ['studentProfile', 'studentProfile.user', 'studentProfile.career'] },
    );
  }
}
