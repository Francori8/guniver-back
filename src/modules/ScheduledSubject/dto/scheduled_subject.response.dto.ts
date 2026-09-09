import { ScheduledSubjectStatus } from '../scheduled_subject.entity';
import { DayOfWeek } from '../schedule_slot.entity';

export class ScheduleSlotResponseDto {
  id: number;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  location?: string;
  isException: boolean;

  constructor(partial: Partial<ScheduleSlotResponseDto>) {
    Object.assign(this, partial);
  }
}

export class ScheduledSubjectResponseDto {
  id: number;
  termId: number;
  careerSubjectId: number;
  subjectName: string;
  status: ScheduledSubjectStatus;
  slots: ScheduleSlotResponseDto[];
  createdAt?: Date;
  updatedAt?: Date;

  constructor(partial: Partial<ScheduledSubjectResponseDto>) {
    Object.assign(this, partial);
  }
}
