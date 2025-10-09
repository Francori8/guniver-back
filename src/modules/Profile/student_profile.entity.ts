import { Entity, ManyToOne, Property } from '@mikro-orm/postgresql';
import { Profile, ProfileType } from './profile.entity';
import { Career } from '../Career/career.entity';

@Entity()
export class StudentProfile extends Profile {
  constructor() {
    super();
    this.type = ProfileType.STUDENT;
  }

  @ManyToOne(() => Career)
  career!: Career;

  @Property()
  enrollmentNumber!: string;

  @Property()
  enrollmentDate!: Date;
}
