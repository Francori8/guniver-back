// src/modules/Career/career.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CareerRepository } from './career.repository';
import { UniversityRepository } from '../University/university.repository';
import { CareerResponseDto } from './dto/career.response.dto';
import { Career } from './career.entity';
import { UpdateCareerDto } from './dto/update_career.dto';
import { CreateCareerDto } from './dto/create_career.dto';
import { PaginatedResult } from 'src/shared/Types/paginated-result';
import { AuditLogService } from '../AuditLog/audit_log.service';
import { AuditAction, AuditEntityType } from '../AuditLog/audit_log.entity';

@Injectable()
export class CareerService {
  constructor(
    private readonly careerRepository: CareerRepository,
    private readonly universityRepository: UniversityRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  toResponseDto(career: Career): CareerResponseDto {
    return new CareerResponseDto({
      id: career.id,
      name: career.name,
      description: career.description,

      university: {
        id: career.university.id,
        name: career.university.name,
      },
      createdAt: career.createdAt,
      updatedAt: career.updatedAt,
    });
  }

  async create(
    createCareerDto: CreateCareerDto,
    actorUserId: number,
  ): Promise<CareerResponseDto> {
    const university = await this.universityRepository.findOne(
      createCareerDto.universityId,
    );
    if (!university) {
      throw new NotFoundException(
        `University with ID ${createCareerDto.universityId} not found`,
      );
    }

    const career = this.careerRepository.create({
      ...createCareerDto,
      university,
    });

    await this.careerRepository.save(career);
    await this.auditLogService.log(
      actorUserId,
      AuditAction.CREATE,
      AuditEntityType.CAREER,
      career.id,
    );
    return this.toResponseDto(career);
  }

  async findAll(): Promise<CareerResponseDto[]> {
    const careers = await this.careerRepository.findAllCareers();
    return careers.map((career) => this.toResponseDto(career));
  }

  async findAllPaginated(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<CareerResponseDto>> {
    const { data, total } = await this.careerRepository.findCareersPaginated(
      page,
      limit,
    );
    return {
      data: data.map((career) => this.toResponseDto(career)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<CareerResponseDto> {
    const career = await this.careerRepository.findOne(id, {
      populate: ['university'],
    });
    if (!career) {
      throw new NotFoundException(`Career with ID ${id} not found`);
    }
    return this.toResponseDto(career);
  }

  async findByUniversity(universityId: number): Promise<CareerResponseDto[]> {
    const careers = await this.careerRepository.findByUniversity(universityId);
    return careers.map((career) => this.toResponseDto(career));
  }

  async findByUniversityPaginated(
    universityId: number,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<CareerResponseDto>> {
    const { data, total } =
      await this.careerRepository.findByUniversityPaginated(
        universityId,
        page,
        limit,
      );
    return {
      data: data.map((career) => this.toResponseDto(career)),
      total,
      page,
      limit,
    };
  }

  async update(
    id: number,
    updates: UpdateCareerDto,
    actorUserId: number,
  ): Promise<CareerResponseDto> {
    const career = await this.careerRepository.findOne(id, {
      populate: ['university'],
    });
    if (!career) {
      throw new NotFoundException(`Career with ID ${id} not found`);
    }

    if (updates.universityId) {
      const university = await this.universityRepository.findOne(
        updates.universityId,
      );
      if (!university) {
        throw new NotFoundException(
          `University with ID ${updates.universityId} not found`,
        );
      }
      career.university = university;
    }

    const { universityId, ...rest } = updates;
    this.careerRepository.assign(career, rest, { ignoreUndefined: true });
    await this.careerRepository.save(career);
    await this.auditLogService.log(
      actorUserId,
      AuditAction.UPDATE,
      AuditEntityType.CAREER,
      career.id,
    );
    return this.toResponseDto(career);
  }

  async delete(id: number, actorUserId: number): Promise<void> {
    const career = await this.careerRepository.findOne(id);
    if (!career) {
      throw new NotFoundException(`Career with ID ${id} not found`);
    }
    await this.careerRepository.removeAndFlush(career);
    await this.auditLogService.log(
      actorUserId,
      AuditAction.DELETE,
      AuditEntityType.CAREER,
      id,
    );
  }
}
