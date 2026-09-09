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
import { Term } from '../Term/term.entity';
import { CareerSubject } from '../CareerSubject/career_subject.entity';
import { ScheduleSlot } from './schedule_slot.entity';

export enum ScheduledSubjectStatus {
  TENTATIVO = 'tentativo',
  CONFIRMADO = 'confirmado',
}

@Entity()
@Unique({ properties: ['term', 'careerSubject'] })
export class ScheduledSubject {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Term)
  term!: Term;

  @ManyToOne(() => CareerSubject)
  careerSubject!: CareerSubject;

  @Enum(() => ScheduledSubjectStatus)
  status: ScheduledSubjectStatus = ScheduledSubjectStatus.TENTATIVO;

  @OneToMany(() => ScheduleSlot, (s) => s.scheduledSubject, {
    orphanRemoval: true,
  })
  slots = new Collection<ScheduleSlot>(this);

  @Property()
  createdAt?: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
