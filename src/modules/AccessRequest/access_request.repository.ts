import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { BaseRepository } from 'src/shared/base-repository';
import { AccessRequest, AccessRequestStatus } from './entities/access_request.entity';

@Injectable()
export class AccessRequestRepository extends BaseRepository<AccessRequest> {
  constructor(em: EntityManager) {
    super(em, AccessRequest);
  }

  async findAllByStatus(status?: AccessRequestStatus): Promise<AccessRequest[]> {
    return this.find(status ? { status } : {}, {
      orderBy: { createdAt: 'desc' },
      populate: ['preferredUniversity', 'preferredCareer'],
    });
  }
}
