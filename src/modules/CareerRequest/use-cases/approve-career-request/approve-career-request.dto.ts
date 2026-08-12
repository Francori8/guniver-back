import { IsDate, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class ApproveCareerRequestDto {
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  enrollmentDate: Date;
}
