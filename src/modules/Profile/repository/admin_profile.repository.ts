// src/modules/University/university.repository.ts
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { BaseRepository } from 'src/shared/base-repository';
import { AdminProfile } from '../entity/admin_profile.entity';

@Injectable()
export class AdminProfileRepository extends BaseRepository<AdminProfile> {
  constructor(em: EntityManager) {
    super(em, AdminProfile);
  }

  async findByIdWithRelations(id: number): Promise<AdminProfile | null> {
    return this.findOne(
      { id },
      { populate: ['user', 'university', 'user.role'] },
    );
  }

  async findByUserId(userId: number): Promise<AdminProfile[]> {
    return this.find({ user: userId }, { populate: ['university'] });
  }
}
