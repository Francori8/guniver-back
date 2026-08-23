// src/modules/Subject/entity/subject.entity.ts
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

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

  @Property()
  credits: number = 0;

  @Property()
  hoursPerWeek: number = 0;

  @Property()
  createdAt?: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
