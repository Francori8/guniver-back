import { RequirementItemKind } from './preview_requirement_import.response.dto';

export class ConfirmRequirementItemDto {
  kind: RequirementItemKind;
  excluded: boolean;
  matchedCareerSubjectId?: number;
  matchedModuleId?: number;
  requiredCredits?: number;
}

export class ConfirmRequirementSectionDto {
  kind: 'cursar' | 'aprobar';
  items: ConfirmRequirementItemDto[];
}

export class ConfirmRequirementImportDto {
  careerSubjectId: number;
  sections: ConfirmRequirementSectionDto[];
}
