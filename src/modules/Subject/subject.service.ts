import { Injectable, NotFoundException } from '@nestjs/common';
import { SubjectRepository } from './subject.repository';
import { CareerRepository } from '../Career/career.repository';
import { Subject } from './subject.entity';
import { SubjectResponseDto } from './dto/subject.response.dto';
import { CreateSubjectDto } from './dto/create_subject.dto';
import { UpdateSubjectDto } from './dto/update_subject.dto';

@Injectable()
export class SubjectService {
  constructor(
    private readonly subjectRepository: SubjectRepository,
    private readonly careerRepository: CareerRepository,
  ) {}

  toResponseDto(subject: Subject): SubjectResponseDto {
    return new SubjectResponseDto({
      id: subject.id,
      name: subject.name,
      description: subject.description,
      code: subject.code,
      credits: subject.credits,
      hoursPerWeek: subject.hoursPerWeek,
      careers: subject.careers?.getItems
        ? subject.careers.getItems().map((c) => ({ id: c.id, name: c.name }))
        : undefined,
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
    });
  }

  async create(createDto: CreateSubjectDto): Promise<SubjectResponseDto> {
    const subject = this.subjectRepository.create({
      ...createDto,
    } as any);

    await this.subjectRepository.save(subject);
    return this.toResponseDto(subject);
  }

  async findAll(filters?: {
    careerId?: number;
    q?: string;
  }): Promise<SubjectResponseDto[]> {
    if (filters?.careerId) {
      const subjects = await this.subjectRepository.findByCareer(
        filters.careerId,
      );
      return subjects.map((s) => this.toResponseDto(s));
    }

    if (filters?.q) {
      const subjects = await this.subjectRepository.searchByName(filters.q);
      return subjects.map((s) => this.toResponseDto(s));
    }

    const subjects = await this.subjectRepository.findAll({
      populate: ['careers'],
    });
    return subjects.map((s) => this.toResponseDto(s));
  }

  async findOne(id: number): Promise<SubjectResponseDto> {
    const subject = await this.subjectRepository.findByIdWithRelations(id);
    if (!subject)
      throw new NotFoundException(`Subject with ID ${id} not found`);
    return this.toResponseDto(subject);
  }

  async update(
    id: number,
    updates: UpdateSubjectDto,
  ): Promise<SubjectResponseDto> {
    const subject = await this.subjectRepository.findOne(id, {
      populate: ['careers'],
    });
    if (!subject)
      throw new NotFoundException(`Subject with ID ${id} not found`);

    this.subjectRepository.assign(subject, updates, { ignoreUndefined: true });
    await this.subjectRepository.save(subject);
    return this.toResponseDto(subject);
  }

  async delete(id: number): Promise<void> {
    const subject = await this.subjectRepository.findOne(id);
    if (!subject)
      throw new NotFoundException(`Subject with ID ${id} not found`);
    await this.subjectRepository.removeAndFlush(subject);
  }
}
