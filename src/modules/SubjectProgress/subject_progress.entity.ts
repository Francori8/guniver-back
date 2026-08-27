import { Entity, PrimaryKey, Property, ManyToOne, Unique, Enum } from '@mikro-orm/core';
import { Term } from '../Term/term.entity';
import { CareerSubject } from '../CareerSubject/career_subject.entity';

// Estados de dominio específicos de esta carrera (no traducibles de forma corta y
// precisa al inglés): "pendiente_aprobacion" = cursó con nota alta, solo debe rendir
// un integrador (distinto de "cursada", que debe el final completo). "desaprobada" =
// cursó y no aprobó la regularidad (a diferencia de "sin_cursar", que nunca la cursó);
// para la lógica de habilitación de correlativas se trata igual que "sin_cursar" (no
// cuenta como cursada-aprobada ni como materia aprobada).
export enum SubjectProgressStatus {
  SIN_CURSAR = 'sin_cursar',
  CURSADA = 'cursada',
  PENDIENTE_APROBACION = 'pendiente_aprobacion',
  APROBADA = 'aprobada',
  DESAPROBADA = 'desaprobada',
}

@Entity()
@Unique({ properties: ['term', 'careerSubject'] })
export class SubjectProgress {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Term)
  term!: Term;

  @ManyToOne(() => CareerSubject)
  careerSubject!: CareerSubject;

  @Enum(() => SubjectProgressStatus)
  status!: SubjectProgressStatus;

  @Property({ nullable: true })
  grade?: number;

  @Property()
  isException: boolean = false;

  @Property({ type: 'text', nullable: true })
  notes?: string;

  @Property()
  createdAt?: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
