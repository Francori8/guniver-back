import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccessRequestRepository } from '../../access_request.repository';
import { AccessRequestStatus } from '../../entities/access_request.entity';

@Injectable()
export class RejectAccessRequestService {
  constructor(private readonly accessRequestRepository: AccessRequestRepository) {}

  async execute(id: number) {
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

    return { id: accessRequest.id, status: accessRequest.status };
  }
}
