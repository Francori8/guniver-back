// src/role/role.repository.ts

import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Role } from '../../entities/role.entity';
import { BaseRepository } from 'src/shared/base-repository';

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
