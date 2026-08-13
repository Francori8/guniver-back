import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';

class ReorderItemDto {
  @IsNumber()
  @Min(1)
  id!: number;

  @IsNumber()
  @Min(0)
  order!: number;
}

export class ReorderStudyMaterialDto {
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[];
}
