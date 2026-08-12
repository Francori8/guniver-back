import { Injectable } from '@nestjs/common';
import { CareerRequestRepository } from '../../career_request.repository';
import { CareerRequest, CareerRequestStatus } from '../../entities/career_request.entity';

@Injectable()
export class ListCareerRequestsService {
  constructor(private readonly careerRequestRepository: CareerRequestRepository) {}

  async execute(status?: CareerRequestStatus): Promise<CareerRequest[]> {
    return this.careerRequestRepository.findAllByStatus(status);
  }
}
