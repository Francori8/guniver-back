// src/user/dto/user-response.dto.ts
import { Exclude, Expose, Type } from 'class-transformer';
import { AdminProfile } from 'src/modules/Profile/entity/admin_profile.entity';
import { StudentProfile } from 'src/modules/Profile/entity/student_profile.entity';

export class UserResponseDto {
  @Expose()
  id: number;

  @Expose()
  email: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  avatar?: string;

  @Expose()
  isActive: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  role: {
    id: number;
    name: string;
    description?: string;
  };

  @Expose()
  @Type(() => StudentProfile)
  studentProfiles: StudentProfile[];

  @Expose()
  @Type(() => AdminProfile)
  adminProfiles: AdminProfile[];

  @Exclude()
  password: string;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
