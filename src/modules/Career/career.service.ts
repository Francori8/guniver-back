// src/modules/Career/career.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CareerRepository } from './career.repository';
import { UniversityRepository } from '../University/university.repository';
import { CareerResponseDto } from './dto/career.response.dto';
import { Career } from './career.entity';
import { UpdateCareerDto } from './dto/update_career.dto';
import { CreateCareerDto } from './dto/create_career.dto';

@Injectable()
export class CareerService {
  constructor(
    private readonly careerRepository: CareerRepository,
    private readonly universityRepository: UniversityRepository,
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

  async create(createCareerDto: CreateCareerDto): Promise<CareerResponseDto> {
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
    return this.toResponseDto(career);
  }

  async findAll(): Promise<CareerResponseDto[]> {
    const careers = await this.careerRepository.findAllCareers();
    return careers.map((career) => this.toResponseDto(career));
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

  async update(
    id: number,
    updates: UpdateCareerDto,
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
    return this.toResponseDto(career);
  }

  async delete(id: number): Promise<void> {
    const career = await this.careerRepository.findOne(id);
    if (!career) {
      throw new NotFoundException(`Career with ID ${id} not found`);
    }
    await this.careerRepository.removeAndFlush(career);
  }
}
