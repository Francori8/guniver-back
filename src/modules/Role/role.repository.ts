// src/role/role.repository.ts

import { EntityManager } from '@mikro-orm/core';
import { Role } from './role.entity';
import { BaseRepository } from 'src/shared/base-repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoleRepository extends BaseRepository<Role> {
  constructor(em: EntityManager) {
    super(em, Role);
  }
  async findByName(name: string): Promise<Role | null> {
    return await this.findOne({ name });
  }
  async findById(id: number): Promise<Role | null> {
    return await this.findOne(id);
  }
}
