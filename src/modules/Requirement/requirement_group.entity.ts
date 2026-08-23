import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  Enum,
  Collection,
  OneToMany,
} from '@mikro-orm/core';
import { CareerSubject } from '../CareerSubject/career_subject.entity';
import { RequirementItem } from './requirement_item.entity';

export enum RequirementKind {
  CURSAR = 'cursar',
  APROBAR = 'aprobar',
}

@Entity()
export class RequirementGroup {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => CareerSubject)
  careerSubject!: CareerSubject;

  @Enum(() => RequirementKind)
  kind!: RequirementKind;

  @Property()
  optionNumber: number = 1;

  @OneToMany(() => RequirementItem, (item) => item.requirementGroup, {
    orphanRemoval: true,
  })
  items = new Collection<RequirementItem>(this);

  @Property()
  createdAt?: Date = new Date();
}
