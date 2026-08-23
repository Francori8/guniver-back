import { RequirementItemType } from '../requirement_item.entity';

export class RequirementItemInputDto {
  type: RequirementItemType;
  targetCareerSubjectId?: number;
  targetModuleId?: number;
  requiredCredits?: number;
}

export class SaveRequirementGroupDto {
  items: RequirementItemInputDto[];
}
