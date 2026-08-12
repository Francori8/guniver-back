import { IsDate, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ApproveAccessRequestDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  universityId: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  careerId: number;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  enrollmentDate: Date;
}
