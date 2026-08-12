import { Injectable } from '@nestjs/common';
import { AccessRequestRepository } from '../../access_request.repository';
import { AccessRequest, AccessRequestStatus } from '../../entities/access_request.entity';

@Injectable()
export class ListAccessRequestsService {
  constructor(private readonly accessRequestRepository: AccessRequestRepository) {}

  async execute(status?: AccessRequestStatus): Promise<AccessRequest[]> {
    return this.accessRequestRepository.findAllByStatus(status);
  }
}
