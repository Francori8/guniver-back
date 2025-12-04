import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { ProfileType } from '../entity/profile.entity';
import { PermissionLevel } from '../entity/admin_profile.entity';

export class CreateProfileDto {
  @IsNotEmpty()
  @IsEnum(ProfileType)
  type: ProfileType;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  universityId: number;

  // Campos específicos para student
  @ValidateIf((obj) => obj.type === ProfileType.STUDENT)
  @IsNumber()
  @Min(1)
  careerId?: number;

  @ValidateIf((obj) => obj.type === ProfileType.STUDENT)
  @IsDate()
  enrollmentDate?: Date;

  // Campos específicos para admin

  @IsEnum(PermissionLevel)
  @ValidateIf((obj) => obj.type === ProfileType.ADMIN)
  permissionLevel?: PermissionLevel;
}
