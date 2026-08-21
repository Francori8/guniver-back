import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { User } from '../User/user.entity';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  ROLE_CHANGE = 'ROLE_CHANGE',
}

export enum AuditEntityType {
  USER = 'User',
  UNIVERSITY = 'University',
  CAREER = 'Career',
  SUBJECT = 'Subject',
  STUDY_MATERIAL = 'StudyMaterial',
  ACCESS_REQUEST = 'AccessRequest',
  CAREER_REQUEST = 'CareerRequest',
}

@Entity()
export class AuditLog {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => User)
  actor!: User;

  @Enum(() => AuditAction)
  action!: AuditAction;

  @Enum(() => AuditEntityType)
  entityType!: AuditEntityType;

  @Property()
  entityId!: number;

  @Property({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>;

  @Property()
  createdAt: Date = new Date();
}
