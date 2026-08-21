import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { BaseRepository } from 'src/shared/base-repository';
import { AuditLog } from './audit_log.entity';

@Injectable()
export class AuditLogRepository extends BaseRepository<AuditLog> {
  constructor(em: EntityManager) {
    super(em, AuditLog);
  }

  async findPaginatedLogs(page: number, limit: number) {
    return this.findPaginated({}, page, limit, {
      populate: ['actor'],
      orderBy: { createdAt: 'DESC' },
    });
  }
}
