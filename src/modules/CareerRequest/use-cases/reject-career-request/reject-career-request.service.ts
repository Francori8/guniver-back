import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CareerRequestRepository } from '../../career_request.repository';
import { CareerRequestStatus } from '../../entities/career_request.entity';

@Injectable()
export class RejectCareerRequestService {
  constructor(private readonly careerRequestRepository: CareerRequestRepository) {}

  async execute(id: number) {
    const careerRequest = await this.careerRequestRepository.findOne(id);
    if (!careerRequest) {
      throw new NotFoundException(`Career request with ID ${id} not found`);
    }
    if (careerRequest.status !== CareerRequestStatus.PENDING) {
      throw new BadRequestException('Esta solicitud ya fue revisada');
    }

    careerRequest.status = CareerRequestStatus.REJECTED;
    careerRequest.reviewedAt = new Date();
    await this.careerRequestRepository.save(careerRequest);

    return { id: careerRequest.id, status: careerRequest.status };
  }
}
