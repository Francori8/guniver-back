// src/entities/University/university.entity.ts
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class University {
  @PrimaryKey()
  id!: number;

  @Property()
  name!: string;

  @Property()
  acronym!: string;

  @Property({ nullable: true })
  address?: string;

  @Property({ nullable: true })
  website?: string;

  @Property({ nullable: true })
  phone?: string;

  @Property()
  createdAt?: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
