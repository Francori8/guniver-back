import { IsOptional, IsString } from 'class-validator';

export class RejectStudyMaterialDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
