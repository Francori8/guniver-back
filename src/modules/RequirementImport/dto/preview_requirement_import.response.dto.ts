export type RequirementItemKind =
  | 'subject_approved'
  | 'module_credits'
  | 'module_complete'
  | 'unrecognized';

export class PreviewRequirementItemDto {
  kind: RequirementItemKind;
  rawCondicion: string;
  // subject_approved
  subjectName?: string;
  subjectCode?: string;
  matchedCareerSubjectId?: number;
  matchedSubjectName?: string;
  // module_credits / module_complete
  moduleName?: string;
  matchedModuleId?: number;
  requiredCredits?: number;
}

export class PreviewRequirementSectionDto {
  kind: 'cursar' | 'aprobar';
  items: PreviewRequirementItemDto[];
  extraOptionsIgnored: number;
}

export class PreviewRequirementImportResponseDto {
  careerSubjectId: number;
  sections: PreviewRequirementSectionDto[];

  constructor(partial: Partial<PreviewRequirementImportResponseDto>) {
    Object.assign(this, partial);
  }
}
