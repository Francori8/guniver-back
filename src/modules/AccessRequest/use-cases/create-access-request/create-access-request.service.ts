import { BadRequestException, Injectable } from '@nestjs/common';
import { AccessRequestRepository } from '../../access_request.repository';
import { AccessRequestStatus } from '../../entities/access_request.entity';
import { MailService } from 'src/modules/Mail/mail.service';
import { UniversityRepository } from 'src/modules/University/university.repository';
import { CareerRepository } from 'src/modules/Career/career.repository';
import { CreateAccessRequestDto } from './create-access-request.dto';

@Injectable()
export class CreateAccessRequestService {
  constructor(
    private readonly accessRequestRepository: AccessRequestRepository,
    private readonly mailService: MailService,
    private readonly universityRepository: UniversityRepository,
    private readonly careerRepository: CareerRepository,
  ) {}

  async execute(dto: CreateAccessRequestDto): Promise<{ id: number; status: AccessRequestStatus }> {
    const existingPending = await this.accessRequestRepository.findOne({
      email: dto.email,
      status: AccessRequestStatus.PENDING,
    });
    if (existingPending) {
      throw new BadRequestException(
        'Ya existe una solicitud pendiente con este email',
      );
    }

    const { preferredUniversityId, preferredCareerId, ...rest } = dto;

    const preferredUniversity = preferredUniversityId
      ? await this.universityRepository.findOne(preferredUniversityId)
      : undefined;
    const preferredCareer = preferredCareerId
      ? await this.careerRepository.findOne(preferredCareerId)
      : undefined;

    const accessRequest = this.accessRequestRepository.create({
      ...rest,
      preferredUniversity: preferredUniversity ?? undefined,
      preferredCareer: preferredCareer ?? undefined,
      status: AccessRequestStatus.PENDING,
    });
    await this.accessRequestRepository.save(accessRequest);

    await this.mailService.sendAccessRequestNotification(accessRequest);

    return { id: accessRequest.id, status: accessRequest.status };
  }
}
