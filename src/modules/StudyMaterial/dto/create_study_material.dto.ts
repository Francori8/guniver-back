import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { MaterialType } from '../study_material.entity';

export class CreateStudyMaterialDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(1)
  subjectId!: number;

  @IsEnum(MaterialType)
  type!: MaterialType;

  @IsUrl({ require_tld: false })
  resourceUrl!: string;

  @IsString()
  @IsOptional()
  cloudinaryPublicId?: string;

  @IsString()
  @IsOptional()
  cloudinaryResourceType?: string;
}
