export class PreviewPlanSubjectRowDto {
  code: string;
  subjectName: string;
  credits: number;
  subjectMatchMethod: 'code' | 'name' | 'none';
  matchedSubjectId?: number;
  matchedSubjectName?: string;
  alreadyInCareer: boolean;
}

export class PreviewPlanModuleSectionDto {
  moduleName: string;
  moduleMatchMethod: 'name' | 'none';
  matchedModuleId?: number;
  rows: PreviewPlanSubjectRowDto[];
}

export class PreviewStudyPlanResponseDto {
  careerId: number;
  sections: PreviewPlanModuleSectionDto[];
  unparsedRows: string[];

  constructor(partial: Partial<PreviewStudyPlanResponseDto>) {
    Object.assign(this, partial);
  }
}
