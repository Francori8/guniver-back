import { TermPeriod } from '../../Term/term.entity';
import { ImportStatus } from '../academic_history.parser';

export class PreviewSubjectRowDto {
  siuCode: string;
  subjectName: string;
  careerSubjectId?: number;
  matchedSubjectName?: string;
  matchMethod: 'code' | 'name' | 'none';
  status: ImportStatus;
  grade?: number;
  regularidadDate: Date;
  needsReview?: string;
  periodUncertain?: boolean;
  alreadyApprovedElsewhere?: boolean;
}

export class PreviewTermGroupDto {
  careerId: number;
  careerName: string;
  year: number;
  period: TermPeriod;
  alreadyExists: boolean;
  existingTermId?: number;
  rows: PreviewSubjectRowDto[];
}

export class PreviewUnmatchedDto {
  siuCode: string;
  subjectName: string;
}

export class PreviewDiscardedDto {
  siuCode: string;
  subjectName: string;
  reason: string;
}

export class PreviewResponseDto {
  termGroups: PreviewTermGroupDto[];
  unmatched: PreviewUnmatchedDto[];
  discarded: PreviewDiscardedDto[];
  unparsedLines: string[];

  // Carrera detectada desde la línea "Propuesta: ..." del PDF. detectedCareerId
  // viene definido solo si esa carrera matcheó con uno de los perfiles del usuario
  // (en ese caso el matching de materias se restringió a esa sola carrera); si
  // detectedCareerName está pero detectedCareerId no, el nombre no coincidió con
  // ninguno de sus perfiles y conviene avisarlo en el frontend.
  detectedCareerName?: string;
  detectedCareerId?: number;

  constructor(partial: Partial<PreviewResponseDto>) {
    Object.assign(this, partial);
  }
}
