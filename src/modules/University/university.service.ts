// src/modules/University/university.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { UniversityRepository } from './university.repository';
import { UniversityResponseDto } from './dtos/university.response.dto';
import { University } from './university.entity';
import { CreateUniversityDto } from './dtos/create_university.dto';
import { UpdateUniversityDto } from './dtos/update_university.dto';
import { PaginatedResult } from 'src/shared/Types/paginated-result';

@Injectable()
export class UniversityService {
  constructor(private readonly universityRepository: UniversityRepository) {}

  toResponseDto(university: University): UniversityResponseDto {
    return new UniversityResponseDto({
      id: university.id,
      name: university.name,
      acronym: university.acronym,
      address: university.address,
      website: university.website,
      phone: university.phone,
      createdAt: university.createdAt,
      updatedAt: university.updatedAt,
    });
  }

  async create(
    createUniversityDto: CreateUniversityDto,
  ): Promise<UniversityResponseDto> {
    const university = this.universityRepository.create(createUniversityDto);
    await this.universityRepository.save(university);
    return this.toResponseDto(university);
  }

  async findAll(): Promise<UniversityResponseDto[]> {
    const universities = await this.universityRepository.findAllUniversities();
    return universities.map((university) => this.toResponseDto(university));
  }

  async findAllPaginated(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<UniversityResponseDto>> {
    const { data, total } =
      await this.universityRepository.findUniversitiesPaginated(page, limit);
    return {
      data: data.map((university) => this.toResponseDto(university)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<UniversityResponseDto> {
    const university = await this.universityRepository.findOne(id);
    if (!university) {
      throw new NotFoundException(`University with ID ${id} not found`);
    }
    return this.toResponseDto(university);
  }

  async update(
    id: number,
    updates: UpdateUniversityDto,
  ): Promise<UniversityResponseDto> {
    const university = await this.universityRepository.findOne(id);
    if (!university) {
      throw new NotFoundException(`University with ID ${id} not found`);
    }

    this.universityRepository.assign(university, updates, {
      ignoreUndefined: true,
    });
    await this.universityRepository.save(university);
    return this.toResponseDto(university);
  }

  async delete(id: number): Promise<void> {
    const university = await this.universityRepository.findOne(id);
    if (!university) {
      throw new NotFoundException(`University with ID ${id} not found`);
    }
    await this.universityRepository.removeAndFlush(university);
  }
}
