import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
  Unique,
  Enum,
} from '@mikro-orm/core';
import { StudentProfile } from '../Profile/entity/student_profile.entity';
import { SubjectProgress } from '../SubjectProgress/subject_progress.entity';

export enum TermPeriod {
  FIRST = 'first',
  SECOND = 'second',
}

@Entity()
@Unique({ properties: ['studentProfile', 'year', 'period'] })
export class Term {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => StudentProfile)
  studentProfile!: StudentProfile;

  @Property()
  year!: number;

  @Enum(() => TermPeriod)
  period!: TermPeriod;

  @Property({ nullable: true })
  label?: string;

  @OneToMany(() => SubjectProgress, (sp) => sp.term, { orphanRemoval: true })
  subjectProgress = new Collection<SubjectProgress>(this);

  @Property()
  createdAt?: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
