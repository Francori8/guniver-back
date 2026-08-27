import { SubjectProgressStatus } from '../subject_progress.entity';

export class SubjectProgressResponseDto {
  id: number;
  termId: number;
  careerSubjectId: number;
  subjectName: string;
  credits: number;
  status: SubjectProgressStatus;
  grade?: number;
  isException: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(partial: Partial<SubjectProgressResponseDto>) {
    Object.assign(this, partial);
  }
}
