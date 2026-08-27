import { SubjectProgressStatus } from '../subject_progress.entity';

export class UpdateSubjectProgressDto {
  status?: SubjectProgressStatus;
  grade?: number;
  isException?: boolean;
  notes?: string;
}
