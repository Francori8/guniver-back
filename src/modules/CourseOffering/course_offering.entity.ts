import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { CareerSubject } from '../CareerSubject/career_subject.entity';
import { TermPeriod } from '../Term/term.entity';
import { CourseOfferingSlot } from './course_offering_slot.entity';

/**
 * Catálogo de "comisiones ofertadas" para una materia en un year/period concreto,
 * importado desde el PDF de oferta que publica la universidad (ej. SIU). Es
 * información compartida entre todos los estudiantes de la carrera — no pertenece
 * a un usuario particular, a diferencia de ScheduledSubject (que sí es el horario
 * elegido por un estudiante puntual, y puede autocompletarse desde acá).
 */
@Entity()
export class CourseOffering {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => CareerSubject)
  careerSubject!: CareerSubject;

  @Property()
  year!: number;

  @Property({ type: 'string' })
  period!: TermPeriod;

  // Código de comisión tal cual lo publica la universidad, ej. "1035-3-G14".
  @Property()
  commission!: string;

  // Modalidad general de la comisión tal cual aparece en el PDF, ej.
  // "Presencial", "Virtual Asincrónica" — informativo, no se usa para lógica.
  @Property({ nullable: true })
  modality?: string;

  @OneToMany(() => CourseOfferingSlot, (s) => s.courseOffering, {
    orphanRemoval: true,
  })
  slots = new Collection<CourseOfferingSlot>(this);

  @Property()
  createdAt?: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
