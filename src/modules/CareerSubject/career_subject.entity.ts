import { Entity, PrimaryKey, Property, ManyToOne, Unique } from '@mikro-orm/core';
import { Career } from '../Career/career.entity';
import { Subject } from '../Subject/subject.entity';
import { StudyPlanModule } from '../StudyPlanModule/study_plan_module.entity';

@Entity()
@Unique({ properties: ['career', 'subject'] })
export class CareerSubject {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Career)
  career!: Career;

  @ManyToOne(() => Subject)
  subject!: Subject;

  @ManyToOne(() => StudyPlanModule, { nullable: true })
  module?: StudyPlanModule;

  @Property()
  credits: number = 0;

  @Property()
  createdAt?: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
