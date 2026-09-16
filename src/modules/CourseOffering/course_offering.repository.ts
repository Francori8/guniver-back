import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { BaseRepository } from 'src/shared/base-repository';
import { CourseOffering } from './course_offering.entity';
import { TermPeriod } from '../Term/term.entity';

@Injectable()
export class CourseOfferingRepository extends BaseRepository<CourseOffering> {
  constructor(em: EntityManager) {
    super(em, CourseOffering);
  }

  async findByCareerSubject(
    careerSubjectId: number,
    year: number,
    period: TermPeriod,
  ): Promise<CourseOffering[]> {
    return this.find(
      { careerSubject: careerSubjectId, year, period },
      { populate: ['slots'] },
    );
  }

  async findByCareer(
    careerId: number,
    year: number,
    period: TermPeriod,
  ): Promise<CourseOffering[]> {
    return this.find(
      { careerSubject: { career: careerId }, year, period },
      { populate: ['careerSubject', 'careerSubject.subject', 'slots'] },
    );
  }

  /**
   * Borra todo el catálogo de comisiones de una carrera para un year/period dado.
   * Se usa al confirmar un reimport (ej. PDF "definitivo" después del
   * "tentativo") para que el catálogo siempre refleje el último PDF subido, sin
   * ir acumulando comisiones duplicadas de imports anteriores.
   */
  async deleteByCareer(
    careerId: number,
    year: number,
    period: TermPeriod,
  ): Promise<void> {
    const existing = await this.find(
      { careerSubject: { career: careerId }, year, period },
      { populate: ['slots'] },
    );
    for (const offering of existing) {
      await this.removeAndFlush(offering);
    }
  }
}
