import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { SubjectProgressStatus } from '../subject_progress.entity';

export class CreateSubjectProgressDto {
  careerSubjectId: number;
  status: SubjectProgressStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  grade?: number;

  isException?: boolean;
  notes?: string;
}
