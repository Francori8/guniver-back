import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { SubjectProgressStatus } from '../subject_progress.entity';

export class UpdateSubjectProgressDto {
  status?: SubjectProgressStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  grade?: number;

  isException?: boolean;
  notes?: string;
}
