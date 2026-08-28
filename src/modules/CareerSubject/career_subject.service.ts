import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CareerSubjectRepository } from './career_subject.repository';
import { StudyPlanModuleRepository } from '../StudyPlanModule/study_plan_module.repository';
import { CareerSubject } from './career_subject.entity';
import { CareerSubjectResponseDto } from './dto/career_subject.response.dto';
import { UpdateCareerSubjectDto } from './dto/update_career_subject.dto';
import { AuditLogService } from '../AuditLog/audit_log.service';
import { AuditAction, AuditEntityType } from '../AuditLog/audit_log.entity';
import { RequirementGroup } from '../Requirement/requirement_group.entity';
import { RequirementItem } from '../Requirement/requirement_item.entity';

@Injectable()
export class CareerSubjectService {
  constructor(
    private readonly careerSubjectRepository: CareerSubjectRepository,
    private readonly studyPlanModuleRepository: StudyPlanModuleRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  toResponseDto(careerSubject: CareerSubject): CareerSubjectResponseDto {
    return new CareerSubjectResponseDto({
      id: careerSubject.id,
      career: { id: careerSubject.career.id, name: careerSubject.career.name },
      subject: {
        id: careerSubject.subject.id,
        name: careerSubject.subject.name,
      },
      module: careerSubject.module
        ? { id: careerSubject.module.id, name: careerSubject.module.name }
        : undefined,
      credits: careerSubject.credits,
      year: careerSubject.year,
      createdAt: careerSubject.createdAt,
      updatedAt: careerSubject.updatedAt,
    });
  }

  async findByCareer(careerId: number): Promise<CareerSubjectResponseDto[]> {
    const rows = await this.careerSubjectRepository.findByCareer(careerId);
    return rows.map((r) => this.toResponseDto(r));
  }

  async findByCareerAndSubject(
    careerId: number,
    subjectId: number,
  ): Promise<CareerSubjectResponseDto> {
    const row = await this.careerSubjectRepository.findByCareerAndSubject(
      careerId,
      subjectId,
    );
    if (!row) {
      throw new NotFoundException(
        `CareerSubject not found for career ${careerId} and subject ${subjectId}`,
      );
    }
    return this.toResponseDto(row);
  }

  async findOne(id: number): Promise<CareerSubjectResponseDto> {
    const row = await this.careerSubjectRepository.findOne(id, {
      populate: ['career', 'subject', 'module'],
    });
    if (!row) {
      throw new NotFoundException(`CareerSubject with ID ${id} not found`);
    }
    return this.toResponseDto(row);
  }

  async update(
    id: number,
    updates: UpdateCareerSubjectDto,
    actorUserId: number,
  ): Promise<CareerSubjectResponseDto> {
    const row = await this.careerSubjectRepository.findOne(id, {
      populate: ['career', 'subject', 'module'],
    });
    if (!row) {
      throw new NotFoundException(`CareerSubject with ID ${id} not found`);
    }

    if (updates.moduleId !== undefined) {
      if (updates.moduleId === null) {
        row.module = undefined;
      } else {
        const module = await this.studyPlanModuleRepository.findOne(
          updates.moduleId,
        );
        if (!module) {
          throw new NotFoundException(
            `StudyPlanModule with ID ${updates.moduleId} not found`,
          );
        }
        row.module = module;
      }
    }

    if (updates.credits !== undefined) {
      row.credits = updates.credits;
    }

    if (updates.year !== undefined) {
      row.year = updates.year === null ? undefined : updates.year;
    }

    await this.careerSubjectRepository.save(row);
    await this.auditLogService.log(
      actorUserId,
      AuditAction.UPDATE,
      AuditEntityType.CAREER_SUBJECT,
      row.id,
    );

    return this.toResponseDto(row);
  }

  async delete(id: number, actorUserId: number): Promise<void> {
    const row = await this.careerSubjectRepository.findOne(id);
    if (!row) {
      throw new NotFoundException(`CareerSubject with ID ${id} not found`);
    }

    const em = this.careerSubjectRepository.em;
    const ownGroupCount = await em.count(RequirementGroup, {
      careerSubject: id,
    });
    if (ownGroupCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar: esta materia tiene requisitos de cursada/aprobación cargados. Eliminalos primero.',
      );
    }

    const targetItemCount = await em.count(RequirementItem, {
      targetCareerSubject: id,
    });
    if (targetItemCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar: esta materia es requisito de otra(s) materia(s). Actualizá esos requisitos primero.',
      );
    }

    await this.careerSubjectRepository.removeAndFlush(row);
    await this.auditLogService.log(
      actorUserId,
      AuditAction.DELETE,
      AuditEntityType.CAREER_SUBJECT,
      id,
    );
  }
}
