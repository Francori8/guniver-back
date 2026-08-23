import { Injectable, NotFoundException } from '@nestjs/common';
import { CareerRepository } from '../Career/career.repository';
import { StudyPlanModuleRepository } from '../StudyPlanModule/study_plan_module.repository';
import { CareerSubjectRepository } from '../CareerSubject/career_subject.repository';
import { RequirementGroupRepository } from '../Requirement/requirement_group.repository';
import { RequirementGroup, RequirementKind } from '../Requirement/requirement_group.entity';
import { CareerSubject } from '../CareerSubject/career_subject.entity';
import {
  CareerTreeResponseDto,
  CareerTreeSubjectDto,
  RequirementRuleDto,
} from './dto/career_tree.response.dto';

@Injectable()
export class CareerTreeService {
  constructor(
    private readonly careerRepository: CareerRepository,
    private readonly studyPlanModuleRepository: StudyPlanModuleRepository,
    private readonly careerSubjectRepository: CareerSubjectRepository,
    private readonly requirementGroupRepository: RequirementGroupRepository,
  ) {}

  private groupToRules(group: RequirementGroup | undefined): RequirementRuleDto[] {
    if (!group) return [];
    return group.items.getItems().map((item) => ({
      type: item.type,
      targetCareerSubjectId: item.targetCareerSubject?.id,
      targetSubjectName: item.targetCareerSubject?.subject.name,
      targetModuleId: item.targetModule?.id,
      targetModuleName: item.targetModule?.name,
      requiredCredits: item.requiredCredits,
    }));
  }

  private toSubjectDto(
    careerSubject: CareerSubject,
    groups: { cursar?: RequirementGroup; aprobar?: RequirementGroup } | undefined,
  ): CareerTreeSubjectDto {
    return {
      id: careerSubject.id,
      subjectId: careerSubject.subject.id,
      name: careerSubject.subject.name,
      credits: careerSubject.credits,
      module: careerSubject.module
        ? { id: careerSubject.module.id, name: careerSubject.module.name }
        : undefined,
      requirements: {
        cursar: this.groupToRules(groups?.cursar),
        aprobar: this.groupToRules(groups?.aprobar),
      },
    };
  }

  async getTree(careerId: number): Promise<CareerTreeResponseDto> {
    const career = await this.careerRepository.findOne(careerId);
    if (!career) {
      throw new NotFoundException(`Career with ID ${careerId} not found`);
    }

    const modules = await this.studyPlanModuleRepository.findByCareer(careerId);
    const careerSubjects = await this.careerSubjectRepository.findByCareer(careerId);
    const requirementGroups = await this.requirementGroupRepository.findByCareer(
      careerId,
    );

    const groupsByCareerSubject = new Map<
      number,
      { cursar?: RequirementGroup; aprobar?: RequirementGroup }
    >();
    for (const group of requirementGroups) {
      const csId = group.careerSubject.id;
      const entry = groupsByCareerSubject.get(csId) || {};
      if (group.kind === RequirementKind.CURSAR) entry.cursar = group;
      else entry.aprobar = group;
      groupsByCareerSubject.set(csId, entry);
    }

    const subjects = careerSubjects.map((cs) =>
      this.toSubjectDto(cs, groupsByCareerSubject.get(cs.id)),
    );

    return new CareerTreeResponseDto({
      career: { id: career.id, name: career.name },
      modules: modules.map((m) => ({
        id: m.id,
        name: m.name,
        order: m.order,
        type: m.type,
        requiredCredits: m.requiredCredits,
      })),
      subjects,
    });
  }
}
