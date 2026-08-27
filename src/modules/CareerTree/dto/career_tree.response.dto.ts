import { StudyPlanModuleType } from '../../StudyPlanModule/study_plan_module.entity';
import { RequirementItemType } from '../../Requirement/requirement_item.entity';

export class RequirementRuleDto {
  type: RequirementItemType;
  targetCareerSubjectId?: number;
  targetSubjectName?: string;
  targetModuleId?: number;
  targetModuleName?: string;
  requiredCredits?: number;
}

export class CareerTreeModuleDto {
  id: number;
  name: string;
  order: number;
  type: StudyPlanModuleType;
  requiredCredits?: number;
}

export class CareerTreeSubjectDto {
  id: number;
  subjectId: number;
  name: string;
  credits: number;
  year?: number;
  module?: { id: number; name: string };
  requirements: {
    cursar: RequirementRuleDto[];
    aprobar: RequirementRuleDto[];
  };
}

export class CareerTreeResponseDto {
  career: { id: number; name: string };
  modules: CareerTreeModuleDto[];
  subjects: CareerTreeSubjectDto[];

  constructor(partial: Partial<CareerTreeResponseDto>) {
    Object.assign(this, partial);
  }
}
