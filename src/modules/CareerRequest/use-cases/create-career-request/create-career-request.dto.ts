import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCareerRequestDto {
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  universityId: number;

  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  careerId: number;

  @IsString()
  @IsOptional()
  message?: string;
}
