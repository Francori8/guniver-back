export class PreviewSlotDto {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isVirtual: boolean;

  constructor(partial: Partial<PreviewSlotDto>) {
    Object.assign(this, partial);
  }
}

export class PreviewCommissionDto {
  subjectName: string;
  commission: string;
  modality?: string;
  slots: PreviewSlotDto[];
  unparsedScheduleText?: string;
  matchedCareerSubjectId?: number;
  matchedSubjectName?: string;
  matchMethod: 'name' | 'fuzzy' | 'none';

  constructor(partial: Partial<PreviewCommissionDto>) {
    Object.assign(this, partial);
  }
}

export class PreviewCourseOfferingResponseDto {
  careerId: number;
  commissions: PreviewCommissionDto[];
  unrecognizedLines: string[];

  constructor(partial: Partial<PreviewCourseOfferingResponseDto>) {
    Object.assign(this, partial);
  }
}
