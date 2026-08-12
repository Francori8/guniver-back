import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateAccessRequestDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  preferredUniversityId?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  preferredCareerId?: number;
}
