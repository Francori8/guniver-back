// src/modules/StudyMaterial/entity/study-material.entity.ts
import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { Subject } from '../Subject/subject.entity';
import { User } from '../User/user.entity';

export enum MaterialType {
  THEORETICAL = 'TEORICO', // Apuntes teóricos
  PRACTICAL = 'PRACTICO', // Ejercicios prácticos
  VIDEO = 'VIDEO', // Videos (YouTube, etc.)
  EXAM = 'EXAMENES', // Exámenes
  SUMMARY = 'RESUMENES', // Resúmenes
  BIBLIO = 'BIBLIOGRAFIA',
  OTHER = 'other', // Otros materiales
}

export enum MaterialStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity()
export class StudyMaterial {
  @PrimaryKey()
  id!: number;

  @Property()
  title!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => Subject)
  subject!: Subject;

  @Enum(() => MaterialType)
  type!: MaterialType;

  @Property()
  resourceUrl!: string;

  @Property({ nullable: true })
  cloudinaryPublicId?: string;

  @Property({ nullable: true })
  cloudinaryResourceType?: string;

  @Property({ nullable: true })
  deletedAt?: Date;

  @Enum(() => MaterialStatus)
  status: MaterialStatus = MaterialStatus.APPROVED;

  @Property({ default: true })
  isOfficial: boolean = true;

  @Property({ type: 'text', nullable: true })
  rejectionReason?: string;

  // Orden dentro de su (subject, type) — más chico va primero. Se reordena
  // desde el panel admin (drag & drop), no depende del orden de creación.
  @Property({ default: 0 })
  order: number = 0;

  @Property({ default: 0 })
  viewCount: number = 0;

  @Property({ default: 0 })
  downloadCount: number = 0;

  @ManyToOne(() => User)
  uploadedBy!: User;

  @Property()
  createdAt?: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
