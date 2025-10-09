// src/modules/Career/career.repository.ts
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { BaseRepository } from 'src/shared/base-repository';
import { Career } from './career.entity';

@Injectable()
export class CareerRepository extends BaseRepository<Career> {
  constructor(em: EntityManager) {
    super(em, Career);
  }

  async findAllCareers(): Promise<Career[]> {
    return this.findAll({ populate: ['university'] });
  }

  async findByUniversity(universityId: number): Promise<Career[]> {
    return this.find(
      { university: { id: universityId } },
      { populate: ['university'] },
    );
  }

  async findByNameAndUniversity(
    name: string,
    universityId: number,
  ): Promise<Career | null> {
    return this.findOne(
      {
        name,
        university: { id: universityId },
      },
      { populate: ['university'] },
    );
  }
}
