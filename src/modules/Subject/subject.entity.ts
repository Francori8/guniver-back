// src/modules/Subject/entity/subject.entity.ts
import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  ManyToMany,
  Collection,
} from '@mikro-orm/core';

import { Career } from '../Career/career.entity';

@Entity()
export class Subject {
  @PrimaryKey()
  id!: number;

  @Property()
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ nullable: true })
  code?: string; // Ej: "IS-101"

  @ManyToMany(() => Career, (career) => career.subjects)
  careers = new Collection<Career>(this);

  @Property()
  credits: number = 0;

  @Property()
  hoursPerWeek: number = 0;

  @Property()
  createdAt?: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
