// src/shared/repositories/base.repository.ts
import {
  EntityData,
  EntityManager,
  EntityRepository,
  IsSubset,
} from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BaseRepository<T extends object> extends EntityRepository<T> {
  constructor(
    readonly em: EntityManager,
    entityClass: new () => T,
  ) {
    super(em, entityClass);
  }

  async save(entity: T): Promise<void> {
    await this.em.persistAndFlush(entity);
  }

  async update(entity: T, partial: Partial<T>) {
    this.assign(entity, partial as any);
    await this.em.persistAndFlush(entity);
  }

  async flushAndRefresh(entity: T): Promise<void> {
    await this.em.flush();
    await this.em.refresh(entity);
  }

  async persist(entity: T): Promise<void> {
    this.em.persist(entity);
  }

  async flush(): Promise<void> {
    await this.em.flush();
  }

  async removeAndFlush(entity: T): Promise<void> {
    await this.em.removeAndFlush(entity);
  }

  async remove(entity: T): Promise<void> {
    this.em.remove(entity);
  }
}
