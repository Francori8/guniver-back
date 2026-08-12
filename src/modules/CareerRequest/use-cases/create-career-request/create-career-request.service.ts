import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CareerRequestRepository } from '../../career_request.repository';
import { CareerRequestStatus } from '../../entities/career_request.entity';
import { CreateCareerRequestDto } from './create-career-request.dto';
import { UserRepository } from 'src/modules/User/user.repository';
import { UniversityRepository } from 'src/modules/University/university.repository';
import { CareerRepository } from 'src/modules/Career/career.repository';
import { StudentProfileRepository } from 'src/modules/Profile/repository/student_profile.repository';

@Injectable()
export class CreateCareerRequestService {
  constructor(
    private readonly careerRequestRepository: CareerRequestRepository,
    private readonly userRepository: UserRepository,
    private readonly universityRepository: UniversityRepository,
    private readonly careerRepository: CareerRepository,
    private readonly studentProfileRepository: StudentProfileRepository,
  ) {}

  async execute(userId: number, dto: CreateCareerRequestDto) {
    const user = await this.userRepository.findOne(userId);
    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

    const university = await this.universityRepository.findOne(dto.universityId);
    if (!university) {
      throw new NotFoundException(`University with ID ${dto.universityId} not found`);
    }

    const career = await this.careerRepository.findOne(dto.careerId);
    if (!career) {
      throw new NotFoundException(`Career with ID ${dto.careerId} not found`);
    }

    const existingProfiles = await this.studentProfileRepository.findByUserId(userId);
    if (existingProfiles.some((p) => p.career.id === dto.careerId)) {
      throw new BadRequestException('Ya estás inscripto en esa carrera');
    }

    const existingPending = await this.careerRequestRepository.findOne({
      user: userId,
      career: dto.careerId,
      status: CareerRequestStatus.PENDING,
    });
    if (existingPending) {
      throw new BadRequestException('Ya tenés una solicitud pendiente para esa carrera');
    }

    const careerRequest = this.careerRequestRepository.create({
      user,
      university,
      career,
      message: dto.message,
      status: CareerRequestStatus.PENDING,
    });
    await this.careerRequestRepository.save(careerRequest);

    return { id: careerRequest.id, status: careerRequest.status };
  }
}
