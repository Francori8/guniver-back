import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CareerRequestRepository } from '../../career_request.repository';
import { CareerRequestStatus } from '../../entities/career_request.entity';
import { ApproveCareerRequestDto } from './approve-career-request.dto';
import { ProfileService } from 'src/modules/Profile/profile.service';
import { ProfileType } from 'src/modules/Profile/entity/profile.entity';
import { AuditLogService } from 'src/modules/AuditLog/audit_log.service';
import { AuditAction, AuditEntityType } from 'src/modules/AuditLog/audit_log.entity';

@Injectable()
export class ApproveCareerRequestService {
  constructor(
    private readonly careerRequestRepository: CareerRequestRepository,
    private readonly profileService: ProfileService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(id: number, dto: ApproveCareerRequestDto, actorUserId: number) {
    const careerRequest = await this.careerRequestRepository.findOne(id);
    if (!careerRequest) {
      throw new NotFoundException(`Career request with ID ${id} not found`);
    }
    if (careerRequest.status !== CareerRequestStatus.PENDING) {
      throw new BadRequestException('Esta solicitud ya fue revisada');
    }

    await this.profileService.createProfile(careerRequest.user.id, {
      type: ProfileType.STUDENT,
      universityId: careerRequest.university.id,
      careerId: careerRequest.career.id,
      enrollmentDate: dto.enrollmentDate,
    });

    careerRequest.status = CareerRequestStatus.APPROVED;
    careerRequest.reviewedAt = new Date();
    await this.careerRequestRepository.save(careerRequest);

    await this.auditLogService.log(
      actorUserId,
      AuditAction.APPROVE,
      AuditEntityType.CAREER_REQUEST,
      careerRequest.id,
    );

    return { id: careerRequest.id, status: careerRequest.status };
  }
}
