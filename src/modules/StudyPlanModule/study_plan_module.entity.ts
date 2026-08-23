import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { Career } from '../Career/career.entity';

export enum StudyPlanModuleType {
  OBLIGATORIO = 'obligatorio',
  OPTATIVO_POR_CREDITOS = 'optativo_por_creditos',
}

@Entity()
export class StudyPlanModule {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Career)
  career!: Career;

  @Property()
  name!: string;

  @Property()
  order: number = 0;

  @Enum(() => StudyPlanModuleType)
  type: StudyPlanModuleType = StudyPlanModuleType.OBLIGATORIO;

  @Property({ nullable: true })
  requiredCredits?: number;

  @Property()
  createdAt?: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
