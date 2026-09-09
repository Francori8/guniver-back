import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { ScheduledSubject } from './scheduled_subject.entity';

export enum DayOfWeek {
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
  SUNDAY = 7,
}

@Entity()
export class ScheduleSlot {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => ScheduledSubject)
  scheduledSubject!: ScheduledSubject;

  @Enum(() => DayOfWeek)
  dayOfWeek!: DayOfWeek;

  // Formato "HH:mm", ej. "14:30" — evita depender del tipo `time` de Postgres
  // y de conversiones de timezone, ya que solo importa la hora del día.
  @Property()
  startTime!: string;

  @Property()
  endTime!: string;

  @Property({ nullable: true })
  location?: string;

  @Property()
  isException: boolean = false;
}
