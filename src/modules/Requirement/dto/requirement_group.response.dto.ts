import { RequirementItemType } from '../requirement_item.entity';

export class RequirementItemResponseDto {
  id: number;
  type: RequirementItemType;
  targetCareerSubject?: { id: number; subjectName: string };
  targetModule?: { id: number; name: string };
  requiredCredits?: number;
}

export class RequirementGroupResponseDto {
  items: RequirementItemResponseDto[];
}

export class CareerSubjectRequirementsResponseDto {
  cursar: RequirementGroupResponseDto;
  aprobar: RequirementGroupResponseDto;
}
