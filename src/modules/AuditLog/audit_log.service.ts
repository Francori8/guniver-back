import { Injectable } from '@nestjs/common';
import { AuditLogRepository } from './audit_log.repository';
import { AuditAction, AuditEntityType } from './audit_log.entity';
import { PaginatedResult } from 'src/shared/Types/paginated-result';

@Injectable()
export class AuditLogService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async log(
    actorUserId: number,
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const entry = this.auditLogRepository.create({
      actor: actorUserId,
      action,
      entityType,
      entityId,
      metadata,
    } as any);
    await this.auditLogRepository.save(entry);
  }

  async findAllPaginated(page: number, limit: number): Promise<PaginatedResult<any>> {
    const { data, total } = await this.auditLogRepository.findPaginatedLogs(page, limit);
    return {
      data: data.map((log) => ({
        id: log.id,
        actor: log.actor
          ? { id: log.actor.id, email: (log.actor as any).email }
          : undefined,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
        createdAt: log.createdAt,
      })),
      total,
      page,
      limit,
    };
  }
}
