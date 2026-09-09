import { IsBoolean, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { DayOfWeek } from '../schedule_slot.entity';

export class ScheduleSlotDto {
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime debe tener formato HH:mm',
  })
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'endTime debe tener formato HH:mm',
  })
  endTime: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  isException?: boolean;
}
