// src/modules/University/university.repository.ts
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { BaseRepository } from 'src/shared/base-repository';
import { University } from './university.entity';

@Injectable()
export class UniversityRepository extends BaseRepository<University> {
  constructor(em: EntityManager) {
    super(em, University);
  }

  async findByName(name: string): Promise<University | null> {
    return this.findOne({ name });
  }

  async findAllUniversities(): Promise<University[]> {
    return this.findAll();
  }
}
