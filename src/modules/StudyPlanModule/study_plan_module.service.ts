import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StudyPlanModuleRepository } from './study_plan_module.repository';
import { CareerRepository } from '../Career/career.repository';
import {
  StudyPlanModule,
  StudyPlanModuleType,
} from './study_plan_module.entity';
import { StudyPlanModuleResponseDto } from './dto/study_plan_module.response.dto';
import { CreateStudyPlanModuleDto } from './dto/create_study_plan_module.dto';
import { UpdateStudyPlanModuleDto } from './dto/update_study_plan_module.dto';
import { AuditLogService } from '../AuditLog/audit_log.service';
import { AuditAction, AuditEntityType } from '../AuditLog/audit_log.entity';
import { CareerSubject } from '../CareerSubject/career_subject.entity';

@Injectable()
export class StudyPlanModuleService {
  constructor(
    private readonly studyPlanModuleRepository: StudyPlanModuleRepository,
    private readonly careerRepository: CareerRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  toResponseDto(module: StudyPlanModule): StudyPlanModuleResponseDto {
    return new StudyPlanModuleResponseDto({
      id: module.id,
      name: module.name,
      order: module.order,
      type: module.type,
      requiredCredits: module.requiredCredits,
      career: {
        id: module.career.id,
        name: module.career.name,
      },
      createdAt: module.createdAt,
      updatedAt: module.updatedAt,
    });
  }

  private validateType(
    type: StudyPlanModuleType,
    requiredCredits?: number,
  ): void {
    if (
      type === StudyPlanModuleType.OPTATIVO_POR_CREDITOS &&
      (requiredCredits === undefined || requiredCredits === null)
    ) {
      throw new BadRequestException(
        'requiredCredits es obligatorio cuando type es optativo_por_creditos',
      );
    }
  }

  async create(
    createDto: CreateStudyPlanModuleDto,
    actorUserId: number,
  ): Promise<StudyPlanModuleResponseDto> {
    const career = await this.careerRepository.findOne(createDto.careerId);
    if (!career) {
      throw new NotFoundException(
        `Career with ID ${createDto.careerId} not found`,
      );
    }

    const type = createDto.type ?? StudyPlanModuleType.OBLIGATORIO;
    this.validateType(type, createDto.requiredCredits);

    const module = this.studyPlanModuleRepository.create({
      career,
      name: createDto.name,
      order: createDto.order ?? 0,
      type,
      requiredCredits: createDto.requiredCredits,
    } as any);
    await this.studyPlanModuleRepository.save(module);

    await this.auditLogService.log(
      actorUserId,
      AuditAction.CREATE,
      AuditEntityType.STUDY_PLAN_MODULE,
      module.id,
    );

    return this.toResponseDto(module);
  }

  async findByCareer(careerId: number): Promise<StudyPlanModuleResponseDto[]> {
    const modules = await this.studyPlanModuleRepository.findByCareer(careerId);
    return modules.map((m) => this.toResponseDto(m));
  }

  async findOne(id: number): Promise<StudyPlanModuleResponseDto> {
    const module = await this.studyPlanModuleRepository.findOne(id, {
      populate: ['career'],
    });
    if (!module) {
      throw new NotFoundException(`StudyPlanModule with ID ${id} not found`);
    }
    return this.toResponseDto(module);
  }

  async update(
    id: number,
    updates: UpdateStudyPlanModuleDto,
    actorUserId: number,
  ): Promise<StudyPlanModuleResponseDto> {
    const module = await this.studyPlanModuleRepository.findOne(id, {
      populate: ['career'],
    });
    if (!module) {
      throw new NotFoundException(`StudyPlanModule with ID ${id} not found`);
    }

    const nextType = updates.type ?? module.type;
    const nextRequiredCredits =
      updates.requiredCredits !== undefined
        ? updates.requiredCredits
        : module.requiredCredits;
    this.validateType(nextType, nextRequiredCredits);

    this.studyPlanModuleRepository.assign(module, updates, {
      ignoreUndefined: true,
    });
    await this.studyPlanModuleRepository.save(module);

    await this.auditLogService.log(
      actorUserId,
      AuditAction.UPDATE,
      AuditEntityType.STUDY_PLAN_MODULE,
      module.id,
    );

    return this.toResponseDto(module);
  }

  async delete(id: number, actorUserId: number): Promise<void> {
    const module = await this.studyPlanModuleRepository.findOne(id);
    if (!module) {
      throw new NotFoundException(`StudyPlanModule with ID ${id} not found`);
    }

    const assignedCount = await this.studyPlanModuleRepository.em.count(
      CareerSubject,
      { module: id },
    );
    if (assignedCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar: este módulo todavía tiene ${assignedCount} materia(s) asignada(s). Reasignalas primero.`,
      );
    }

    await this.studyPlanModuleRepository.removeAndFlush(module);
    await this.auditLogService.log(
      actorUserId,
      AuditAction.DELETE,
      AuditEntityType.STUDY_PLAN_MODULE,
      id,
    );
  }
}
