// src/entities/role.entity.ts
import {
  Entity,
  PrimaryKey,
  Property,
  Collection,
  OneToMany,
} from '@mikro-orm/core';
import { User } from './user.entity';

@Entity()
export class Role {
  @PrimaryKey()
  id!: number;

  @Property({ unique: true })
  name!: string;

  @Property({ nullable: true })
  description?: string;

  @OneToMany(() => User, (user) => user.role)
  users = new Collection<User>(this);

  @Property()
  createdAt?: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
