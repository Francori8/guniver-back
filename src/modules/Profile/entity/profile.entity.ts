import { Entity, ManyToOne, PrimaryKey, Property, Enum } from '@mikro-orm/core';
import { University } from '../../University/university.entity';
import { User } from '../../User/user.entity';

@Entity({
  abstract: true,
  tableName: 'profile',
})
export abstract class Profile {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => University)
  university!: University;

  @Enum(() => ProfileType)
  type!: ProfileType;

  @Property()
  createdAt?: Date = new Date();

  @Property({ default: true })
  isActive: boolean = true;
}

export enum ProfileType {
  STUDENT = 'student',
  ADMIN = 'admin',
}
