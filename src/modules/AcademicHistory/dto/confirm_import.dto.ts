import { TermPeriod } from '../../Term/term.entity';
import { ImportStatus } from '../academic_history.parser';

export class ConfirmImportRowDto {
  careerSubjectId?: number;
  status: ImportStatus;
  grade?: number;
  excluded: boolean;
}

export class ConfirmImportTermGroupDto {
  careerId: number;
  year: number;
  period: TermPeriod;
  existingTermId?: number;
  rows: ConfirmImportRowDto[];
}

export class ConfirmImportDto {
  termGroups: ConfirmImportTermGroupDto[];
}
