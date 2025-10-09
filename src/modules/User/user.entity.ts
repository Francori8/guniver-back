// src/entities/user.entity.ts
import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { Role } from '../Role/role.entity';
import { Profile } from '../Profile/profile.entity';
import { StudentProfile } from '../Profile/student_profile.entity';
import { AdminProfile } from '../Profile/admin_profile.entity';

@Entity()
export class User {
  @PrimaryKey()
  id!: number;

  @Property({ unique: true })
  email!: string;

  @Property()
  password!: string;

  @Property()
  firstName!: string;

  @Property()
  lastName!: string;

  @ManyToOne(() => Role)
  role!: Role;

  @Property({ nullable: true })
  avatar?: string;

  @Property()
  isActive: boolean = true;

  @Property()
  createdAt?: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt?: Date = new Date();

  @OneToMany(() => StudentProfile, (profile) => profile.user)
  studentProfiles = new Collection<StudentProfile>(this);

  @OneToMany(() => AdminProfile, (profile) => profile.user)
  adminProfiles = new Collection<AdminProfile>(this);
}
