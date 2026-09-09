import { IsArray, IsEnum, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduledSubjectStatus } from '../scheduled_subject.entity';
import { ScheduleSlotDto } from './schedule_slot.dto';

export class CreateScheduledSubjectDto {
  @IsNumber()
  careerSubjectId: number;

  @IsOptional()
  @IsEnum(ScheduledSubjectStatus)
  status?: ScheduledSubjectStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  slots: ScheduleSlotDto[];
}
