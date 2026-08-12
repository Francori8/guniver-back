import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { BaseRepository } from 'src/shared/base-repository';
import { CareerRequest, CareerRequestStatus } from './entities/career_request.entity';

@Injectable()
export class CareerRequestRepository extends BaseRepository<CareerRequest> {
  constructor(em: EntityManager) {
    super(em, CareerRequest);
  }

  async findAllByStatus(status?: CareerRequestStatus): Promise<CareerRequest[]> {
    return this.find(status ? { status } : {}, {
      orderBy: { createdAt: 'desc' },
      populate: ['user', 'university', 'career'],
    });
  }
}
