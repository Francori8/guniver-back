import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SubjectRepository } from './subject.repository';
import { CareerRepository } from '../Career/career.repository';
import { Subject } from './subject.entity';
import { StudyMaterial } from '../StudyMaterial/study_material.entity';
import { SubjectResponseDto } from './dto/subject.response.dto';
import { CreateSubjectDto } from './dto/create_subject.dto';
import { UpdateSubjectDto } from './dto/update_subject.dto';
import { PaginatedResult } from 'src/shared/Types/paginated-result';
import { AuditLogService } from '../AuditLog/audit_log.service';
import { AuditAction, AuditEntityType } from '../AuditLog/audit_log.entity';
import { CareerSubjectRepository } from '../CareerSubject/career_subject.repository';
import { RequirementGroupRepository } from '../Requirement/requirement_group.repository';
import { RequirementItemRepository } from '../Requirement/requirement_item.repository';

@Injectable()
export class SubjectService {
  constructor(
    private readonly subjectRepository: SubjectRepository,
    private readonly careerRepository: CareerRepository,
    private readonly careerSubjectRepository: CareerSubjectRepository,
    private readonly requirementGroupRepository: RequirementGroupRepository,
    private readonly requirementItemRepository: RequirementItemRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async toResponseDto(subject: Subject): Promise<SubjectResponseDto> {
    const links = await this.subjectRepository.findCareerLinksBySubject(
      subject.id,
    );
    return new SubjectResponseDto({
      id: subject.id,
      name: subject.name,
      description: subject.description,
      code: subject.code,
      credits: subject.credits,
      hoursPerWeek: subject.hoursPerWeek,
      careers: links.map((l) => ({ id: l.career.id, name: l.career.name })),
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
    });
  }

  async create(
    createDto: CreateSubjectDto,
    actorUserId: number,
  ): Promise<SubjectResponseDto> {
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
      const careerSubject = this.careerSubjectRepository.create({
        career,
        subject,
        credits: subject.credits,
      } as any);
      await this.careerSubjectRepository.save(careerSubject);
    }

    await this.auditLogService.log(
      actorUserId,
      AuditAction.CREATE,
      AuditEntityType.SUBJECT,
      subject.id,
    );

    const created = await this.subjectRepository.findByIdWithRelations(subject.id);
    return this.toResponseDto(created!);
  }

  async findAll(filters?: {
    careerId?: number;
    q?: string;
  }): Promise<SubjectResponseDto[]> {
    let subjects: Subject[];
    if (filters?.careerId) {
      subjects = await this.subjectRepository.findByCareer(filters.careerId);
    } else if (filters?.q) {
      subjects = await this.subjectRepository.searchByName(filters.q);
    } else {
      subjects = await this.subjectRepository.findAll();
    }
    return Promise.all(subjects.map((s) => this.toResponseDto(s)));
  }

  async findAllPaginated(
    page: number,
    limit: number,
    filters?: { careerId?: number; q?: string },
  ): Promise<PaginatedResult<SubjectResponseDto>> {
    const { data, total } = await this.subjectRepository.findSubjectsPaginated(
      page,
      limit,
      filters,
    );
    return {
      data: await Promise.all(data.map((s) => this.toResponseDto(s))),
      total,
      page,
      limit,
    };
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
    actorUserId: number,
  ): Promise<SubjectResponseDto> {
    const subject = await this.subjectRepository.findOne(id);
    if (!subject)
      throw new NotFoundException(`Subject with ID ${id} not found`);

    const { careerIds, ...rest } = updates;

    if (careerIds) {
      const desiredIds = new Set(careerIds);
      const currentLinks = await this.subjectRepository.findCareerLinksBySubject(
        id,
      );
      const currentIds = new Set(currentLinks.map((l) => l.career.id));

      for (const link of currentLinks) {
        if (!desiredIds.has(link.career.id)) {
          const ownGroupCount =
            await this.requirementGroupRepository.countByCareerSubject(link.id);
          const targetItemCount =
            await this.requirementItemRepository.countByTargetCareerSubject(
              link.id,
            );
          if (ownGroupCount > 0 || targetItemCount > 0) {
            throw new BadRequestException(
              `No se puede quitar la materia de la carrera "${link.career.name}": tiene requisitos de cursada/aprobación cargados (propios o de otra materia que la referencia). Eliminalos primero.`,
            );
          }
          await this.careerSubjectRepository.removeAndFlush(link);
        }
      }

      for (const careerId of careerIds) {
        if (!currentIds.has(careerId)) {
          const career = await this.careerRepository.findOne(careerId);
          if (!career) {
            throw new NotFoundException(`Career with ID ${careerId} not found`);
          }
          const careerSubject = this.careerSubjectRepository.create({
            career,
            subject,
            credits: subject.credits,
          } as any);
          await this.careerSubjectRepository.save(careerSubject);
        }
      }
    }

    this.subjectRepository.assign(subject, rest, { ignoreUndefined: true });
    await this.subjectRepository.save(subject);

    await this.auditLogService.log(
      actorUserId,
      AuditAction.UPDATE,
      AuditEntityType.SUBJECT,
      subject.id,
    );

    const updated = await this.subjectRepository.findByIdWithRelations(subject.id);
    return this.toResponseDto(updated!);
  }

  async delete(id: number, actorUserId: number): Promise<void> {
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

    const links = await this.subjectRepository.findCareerLinksBySubject(id);
    for (const link of links) {
      const ownGroupCount = await this.requirementGroupRepository.countByCareerSubject(
        link.id,
      );
      const targetItemCount =
        await this.requirementItemRepository.countByTargetCareerSubject(link.id);
      if (ownGroupCount > 0 || targetItemCount > 0) {
        throw new BadRequestException(
          `No se puede eliminar: esta materia tiene requisitos de cursada/aprobación cargados (propios o de otra materia que la referencia) en la carrera "${link.career.name}". Eliminalos primero.`,
        );
      }
    }
    for (const link of links) {
      await this.careerSubjectRepository.removeAndFlush(link);
    }

    await this.subjectRepository.removeAndFlush(subject);
    await this.auditLogService.log(
      actorUserId,
      AuditAction.DELETE,
      AuditEntityType.SUBJECT,
      id,
    );
  }
}
