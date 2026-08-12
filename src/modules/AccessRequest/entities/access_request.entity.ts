import { Entity, Enum, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { University } from '../../University/university.entity';
import { Career } from '../../Career/career.entity';

export enum AccessRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity()
export class AccessRequest {
  @PrimaryKey()
  id!: number;

  @Property()
  firstName!: string;

  @Property()
  lastName!: string;

  @Property()
  email!: string;

  @Property({ nullable: true, type: 'text' })
  message?: string;

  @ManyToOne(() => University, { nullable: true })
  preferredUniversity?: University;

  @ManyToOne(() => Career, { nullable: true })
  preferredCareer?: Career;

  @Enum(() => AccessRequestStatus)
  status: AccessRequestStatus = AccessRequestStatus.PENDING;

  @Property()
  createdAt?: Date = new Date();

  @Property({ nullable: true })
  reviewedAt?: Date;
}
