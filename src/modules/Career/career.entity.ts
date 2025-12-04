// src/entities/Career/career.entity.ts
import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  ManyToMany,
  Collection,
} from '@mikro-orm/core';
import { University } from '../University/university.entity';
import { Subject } from '../Subject/subject.entity';

@Entity()
export class Career {
  @PrimaryKey()
  id!: number;

  @Property()
  name!: string;

  @Property({ nullable: true })
  description?: string;

  @ManyToMany(() => Subject, (subject) => subject.careers, { owner: true })
  subjects = new Collection<Subject>(this);

  @ManyToOne(() => University)
  university!: University;

  @Property()
  createdAt?: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
