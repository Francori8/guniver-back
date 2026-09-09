import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { CourseOffering } from './course_offering.entity';
import { DayOfWeek } from '../ScheduledSubject/schedule_slot.entity';

@Entity()
export class CourseOfferingSlot {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => CourseOffering)
  courseOffering!: CourseOffering;

  @Enum(() => DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @Property()
  startTime!: string; // "HH:mm"

  @Property()
  endTime!: string; // "HH:mm"

  @Property()
  isVirtual: boolean = false;
}
