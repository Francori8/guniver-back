import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { RequirementGroup } from './requirement_group.entity';
import { CareerSubject } from '../CareerSubject/career_subject.entity';
import { StudyPlanModule } from '../StudyPlanModule/study_plan_module.entity';

export enum RequirementItemType {
  SUBJECT_APPROVED = 'subject_approved',
  MODULE_CREDITS = 'module_credits',
  MODULE_COMPLETE = 'module_complete',
}

@Entity()
export class RequirementItem {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => RequirementGroup)
  requirementGroup!: RequirementGroup;

  @Enum(() => RequirementItemType)
  type!: RequirementItemType;

  @ManyToOne(() => CareerSubject, { nullable: true })
  targetCareerSubject?: CareerSubject;

  @ManyToOne(() => StudyPlanModule, { nullable: true })
  targetModule?: StudyPlanModule;

  @Property({ nullable: true })
  requiredCredits?: number;
}
