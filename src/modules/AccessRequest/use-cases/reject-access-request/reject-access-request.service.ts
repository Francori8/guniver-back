import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccessRequestRepository } from '../../access_request.repository';
import { AccessRequestStatus } from '../../entities/access_request.entity';
import { AuditLogService } from 'src/modules/AuditLog/audit_log.service';
import { AuditAction, AuditEntityType } from 'src/modules/AuditLog/audit_log.entity';

@Injectable()
export class RejectAccessRequestService {
  constructor(
    private readonly accessRequestRepository: AccessRequestRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(id: number, actorUserId: number) {
    const accessRequest = await this.accessRequestRepository.findOne(id);
    if (!accessRequest) {
      throw new NotFoundException(`Access request with ID ${id} not found`);
    }
    if (accessRequest.status !== AccessRequestStatus.PENDING) {
      throw new BadRequestException('Esta solicitud ya fue revisada');
    }

    accessRequest.status = AccessRequestStatus.REJECTED;
    accessRequest.reviewedAt = new Date();
    await this.accessRequestRepository.save(accessRequest);

    await this.auditLogService.log(
      actorUserId,
      AuditAction.REJECT,
      AuditEntityType.ACCESS_REQUEST,
      accessRequest.id,
    );

    return { id: accessRequest.id, status: accessRequest.status };
  }
}
