// src/modules/University/university.repository.ts
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { BaseRepository } from 'src/shared/base-repository';
import { AdminProfile } from '../entity/admin_profile.entity';
import { StudentProfile } from '../entity/student_profile.entity';

@Injectable()
export class StudentProfileRepository extends BaseRepository<StudentProfile> {
  constructor(em: EntityManager) {
    super(em, StudentProfile);
  }

  async findByIdWithRelations(id: number): Promise<StudentProfile | null> {
    return this.findOne(
      { id },
      { populate: ['user', 'university', 'career', 'user.role'] },
    );
  }

  async findByUserId(userId: number): Promise<StudentProfile[]> {
    return this.find({ user: userId }, { populate: ['university', 'career'] });
  }

  async findByUniversityId(universityId: number): Promise<StudentProfile[]> {
    return this.find(
      { university: universityId },
      { populate: ['user', 'career'] },
    );
  }
}
