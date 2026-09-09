import { TermPeriod } from '../../Term/term.entity';

export class CourseOfferingSlotResponseDto {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isVirtual: boolean;

  constructor(partial: Partial<CourseOfferingSlotResponseDto>) {
    Object.assign(this, partial);
  }
}

export class CourseOfferingResponseDto {
  id: number;
  careerSubjectId: number;
  subjectName: string;
  year: number;
  period: TermPeriod;
  commission: string;
  modality?: string;
  slots: CourseOfferingSlotResponseDto[];

  constructor(partial: Partial<CourseOfferingResponseDto>) {
    Object.assign(this, partial);
  }
}
