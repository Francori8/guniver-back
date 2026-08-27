import { SubjectProgressStatus } from '../subject_progress.entity';

export class CreateSubjectProgressDto {
  careerSubjectId: number;
  status: SubjectProgressStatus;
  grade?: number;
  isException?: boolean;
  notes?: string;
}
