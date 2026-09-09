import { IsArray, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduledSubjectStatus } from '../scheduled_subject.entity';
import { ScheduleSlotDto } from './schedule_slot.dto';

export class UpdateScheduledSubjectDto {
  @IsOptional()
  @IsEnum(ScheduledSubjectStatus)
  status?: ScheduledSubjectStatus;

  // Si se envía, reemplaza por completo el set de slots existentes.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  slots?: ScheduleSlotDto[];
}
