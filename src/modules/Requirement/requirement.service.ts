import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RequirementGroupRepository } from './requirement_group.repository';
import { CareerSubjectRepository } from '../CareerSubject/career_subject.repository';
import { StudyPlanModuleRepository } from '../StudyPlanModule/study_plan_module.repository';
import { RequirementGroup, RequirementKind } from './requirement_group.entity';
import { RequirementItem, RequirementItemType } from './requirement_item.entity';
import {
  RequirementItemInputDto,
  SaveRequirementGroupDto,
} from './dto/requirement_item.dto';
import {
  CareerSubjectRequirementsResponseDto,
  RequirementGroupResponseDto,
  RequirementItemResponseDto,
} from './dto/requirement_group.response.dto';
import { AuditLogService } from '../AuditLog/audit_log.service';
import { AuditAction, AuditEntityType } from '../AuditLog/audit_log.entity';

@Injectable()
export class RequirementService {
  constructor(
    private readonly requirementGroupRepository: RequirementGroupRepository,
    private readonly careerSubjectRepository: CareerSubjectRepository,
    private readonly studyPlanModuleRepository: StudyPlanModuleRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  private validateItem(item: RequirementItemInputDto): void {
    switch (item.type) {
      case RequirementItemType.SUBJECT_APPROVED:
        if (!item.targetCareerSubjectId) {
          throw new BadRequestException(
            'targetCareerSubjectId es obligatorio para type=subject_approved',
          );
        }
        break;
      case RequirementItemType.MODULE_CREDITS:
        if (!item.targetModuleId || item.requiredCredits === undefined) {
          throw new BadRequestException(
            'targetModuleId y requiredCredits son obligatorios para type=module_credits',
          );
        }
        break;
      case RequirementItemType.MODULE_COMPLETE:
        if (!item.targetModuleId) {
          throw new BadRequestException(
            'targetModuleId es obligatorio para type=module_complete',
          );
        }
        break;
      default:
        throw new BadRequestException(`type inválido: ${item.type}`);
    }
  }

  private groupToResponseDto(
    group: RequirementGroup | null,
  ): RequirementGroupResponseDto {
    if (!group) return { items: [] };
    const items: RequirementItemResponseDto[] = group.items
      .getItems()
      .map((item) => ({
        id: item.id,
        type: item.type,
        targetCareerSubject: item.targetCareerSubject
          ? {
              id: item.targetCareerSubject.id,
              subjectName: item.targetCareerSubject.subject.name,
            }
          : undefined,
        targetModule: item.targetModule
          ? { id: item.targetModule.id, name: item.targetModule.name }
          : undefined,
        requiredCredits: item.requiredCredits,
      }));
    return { items };
  }

  async getByCareerSubject(
    careerSubjectId: number,
  ): Promise<CareerSubjectRequirementsResponseDto> {
    const careerSubject = await this.careerSubjectRepository.findOne(
      careerSubjectId,
    );
    if (!careerSubject) {
      throw new NotFoundException(
        `CareerSubject with ID ${careerSubjectId} not found`,
      );
    }

    const cursar = await this.requirementGroupRepository.findByCareerSubjectAndKind(
      careerSubjectId,
      RequirementKind.CURSAR,
    );
    const aprobar = await this.requirementGroupRepository.findByCareerSubjectAndKind(
      careerSubjectId,
      RequirementKind.APROBAR,
    );

    return {
      cursar: this.groupToResponseDto(cursar),
      aprobar: this.groupToResponseDto(aprobar),
    };
  }

  async save(
    careerSubjectId: number,
    kind: RequirementKind,
    dto: SaveRequirementGroupDto,
    actorUserId: number,
  ): Promise<RequirementGroupResponseDto> {
    const careerSubject = await this.careerSubjectRepository.findOne(
      careerSubjectId,
    );
    if (!careerSubject) {
      throw new NotFoundException(
        `CareerSubject with ID ${careerSubjectId} not found`,
      );
    }

    for (const item of dto.items) {
      this.validateItem(item);
    }

    const em = this.requirementGroupRepository.em;

    const existing = await this.requirementGroupRepository.findByCareerSubjectAndKind(
      careerSubjectId,
      kind,
    );
    if (existing) {
      await this.requirementGroupRepository.removeAndFlush(existing);
    }

    const group = this.requirementGroupRepository.create({
      careerSubject,
      kind,
      optionNumber: 1,
    } as any);
    await this.requirementGroupRepository.save(group);

    for (const itemDto of dto.items) {
      const item = em.create(RequirementItem, {
        requirementGroup: group,
        type: itemDto.type,
        requiredCredits: itemDto.requiredCredits,
      } as any);

      if (itemDto.targetCareerSubjectId) {
        const target = await this.careerSubjectRepository.findOne(
          itemDto.targetCareerSubjectId,
        );
        if (!target) {
          throw new NotFoundException(
            `CareerSubject with ID ${itemDto.targetCareerSubjectId} not found`,
          );
        }
        item.targetCareerSubject = target;
      }

      if (itemDto.targetModuleId) {
        const targetModule = await this.studyPlanModuleRepository.findOne(
          itemDto.targetModuleId,
        );
        if (!targetModule) {
          throw new NotFoundException(
            `StudyPlanModule with ID ${itemDto.targetModuleId} not found`,
          );
        }
        item.targetModule = targetModule;
      }

      em.persist(item);
    }

    await em.flush();

    await this.auditLogService.log(
      actorUserId,
      AuditAction.UPDATE,
      AuditEntityType.CAREER_SUBJECT,
      careerSubjectId,
      { requirementsKind: kind },
    );

    const saved = await this.requirementGroupRepository.findByCareerSubjectAndKind(
      careerSubjectId,
      kind,
    );
    return this.groupToResponseDto(saved);
  }
}
