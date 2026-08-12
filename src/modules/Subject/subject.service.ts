import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SubjectRepository } from './subject.repository';
import { CareerRepository } from '../Career/career.repository';
import { Subject } from './subject.entity';
import { StudyMaterial } from '../StudyMaterial/study_material.entity';
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
    const { careerIds, ...subjectData } = createDto;

    if (!careerIds || careerIds.length === 0) {
      throw new BadRequestException('careerIds no puede estar vacío');
    }

    const subject = this.subjectRepository.create({ ...subjectData } as any);
    await this.subjectRepository.save(subject);

    for (const careerId of careerIds) {
      const career = await this.careerRepository.findOne(careerId);
      if (!career) {
        throw new NotFoundException(`Career with ID ${careerId} not found`);
      }
      // Career es el dueño de la relación M2M, hay que agregar desde ese lado
      // para que MikroORM persista la tabla intermedia correctamente.
      career.subjects.add(subject);
      await this.careerRepository.save(career);
    }

    const created = await this.subjectRepository.findByIdWithRelations(subject.id);
    return this.toResponseDto(created!);
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

    const { careerIds, ...rest } = updates;

    if (careerIds) {
      const desiredIds = new Set(careerIds);
      const currentCareers = subject.careers.getItems();
      const currentIds = new Set(currentCareers.map((c) => c.id));

      for (const career of currentCareers) {
        if (!desiredIds.has(career.id)) {
          await career.subjects.init();
          career.subjects.remove(subject);
          await this.careerRepository.save(career);
        }
      }

      for (const careerId of careerIds) {
        if (!currentIds.has(careerId)) {
          const career = await this.careerRepository.findOne(careerId);
          if (!career) {
            throw new NotFoundException(`Career with ID ${careerId} not found`);
          }
          career.subjects.add(subject);
          await this.careerRepository.save(career);
        }
      }
    }

    this.subjectRepository.assign(subject, rest, { ignoreUndefined: true });
    await this.subjectRepository.save(subject);

    const updated = await this.subjectRepository.findByIdWithRelations(subject.id);
    return this.toResponseDto(updated!);
  }

  async delete(id: number): Promise<void> {
    const subject = await this.subjectRepository.findOne(id);
    if (!subject)
      throw new NotFoundException(`Subject with ID ${id} not found`);

    const materialCount = await this.subjectRepository.em.count(StudyMaterial, {
      subject: id,
    });
    if (materialCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar: esta materia todavía tiene ${materialCount} material(es) asociado(s) (incluida la papelera). Movelos o eliminalos primero desde Materiales.`,
      );
    }

    await this.subjectRepository.removeAndFlush(subject);
  }
}
