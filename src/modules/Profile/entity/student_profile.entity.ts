import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { Profile, ProfileType } from './profile.entity';
import { Career } from '../../Career/career.entity';

@Entity({
  tableName: 'student_profile', // ← Nombre explícito de tabla
})
export class StudentProfile extends Profile {
  constructor() {
    super();
    this.type = ProfileType.STUDENT;
  }

  @ManyToOne(() => Career)
  career!: Career;

  @Property()
  enrollmentDate!: Date;
}
