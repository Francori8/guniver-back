import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TermPeriod } from '../../Term/term.entity';

export class ConfirmSlotDto {
  @IsNumber()
  dayOfWeek: number;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsOptional()
  @IsBoolean()
  isVirtual?: boolean;
}

export class ConfirmCommissionDto {
  @IsNumber()
  careerSubjectId: number;

  @IsString()
  commission: string;

  @IsOptional()
  @IsString()
  modality?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmSlotDto)
  slots: ConfirmSlotDto[];

  @IsOptional()
  @IsBoolean()
  excluded?: boolean;
}

export class ConfirmCourseOfferingImportDto {
  @IsNumber()
  year: number;

  @IsEnum(TermPeriod)
  period: TermPeriod;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmCommissionDto)
  commissions: ConfirmCommissionDto[];
}
