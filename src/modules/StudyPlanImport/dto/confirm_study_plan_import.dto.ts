export class ConfirmPlanSubjectRowDto {
  code: string;
  subjectName: string;
  credits: number;
  excluded: boolean;
  // Si matcheó una Subject existente (por código o nombre), se reusa esa —
  // si no, se crea una nueva con subjectName/code/credits de esta fila.
  matchedSubjectId?: number;
}

export class ConfirmPlanModuleSectionDto {
  moduleName: string;
  // Si matcheó un StudyPlanModule existente, se reusa ese — si no, se crea uno
  // nuevo como "obligatorio" (el admin lo ajusta después si corresponde).
  matchedModuleId?: number;
  rows: ConfirmPlanSubjectRowDto[];
}

export class ConfirmStudyPlanImportDto {
  careerId: number;
  sections: ConfirmPlanModuleSectionDto[];
}
