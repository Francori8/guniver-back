import { Entity, Enum, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { User } from '../../User/user.entity';
import { University } from '../../University/university.entity';
import { Career } from '../../Career/career.entity';

export enum CareerRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity()
export class CareerRequest {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => University)
  university!: University;

  @ManyToOne(() => Career)
  career!: Career;

  @Property({ nullable: true, type: 'text' })
  message?: string;

  @Enum(() => CareerRequestStatus)
  status: CareerRequestStatus = CareerRequestStatus.PENDING;

  @Property()
  createdAt?: Date = new Date();

  @Property({ nullable: true })
  reviewedAt?: Date;
}
