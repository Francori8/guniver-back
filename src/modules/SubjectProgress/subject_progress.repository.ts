import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { BaseRepository } from 'src/shared/base-repository';
import { SubjectProgress } from './subject_progress.entity';

@Injectable()
export class SubjectProgressRepository extends BaseRepository<SubjectProgress> {
  constructor(em: EntityManager) {
    super(em, SubjectProgress);
  }

  async findByTerm(termId: number): Promise<SubjectProgress[]> {
    return this.find(
      { term: termId },
      { populate: ['careerSubject', 'careerSubject.subject'] },
    );
  }

  async findByTermAndCareerSubject(
    termId: number,
    careerSubjectId: number,
  ): Promise<SubjectProgress | null> {
    return this.findOne({ term: termId, careerSubject: careerSubjectId });
  }

  /**
   * Todos los SubjectProgress de un estudiante para una carrera (join a través de
   * term.studentProfile), con el term populado para poder calcular cuál es el
   * "estado vigente" cuando hay recursadas (misma careerSubject en varios term).
   */
  async findByStudentProfileAndCareer(
    studentProfileId: number,
    careerId: number,
  ): Promise<SubjectProgress[]> {
    return this.find(
      {
        term: { studentProfile: studentProfileId },
        careerSubject: { career: careerId },
      },
      { populate: ['term', 'careerSubject'] },
    );
  }

  /**
   * Todos los SubjectProgress de un usuario en CUALQUIERA de sus carreras (join a
   * través de term.studentProfile.user), con careerSubject.subject populado —
   * permite detectar materias aprobadas en otra carrera que comparten la misma
   * Subject (ej. "Matemática 1" vinculada tanto a Licenciatura como a Tecnicatura).
   */
  async findByUserAcrossCareers(userId: number): Promise<SubjectProgress[]> {
    return this.find(
      { term: { studentProfile: { user: userId } } },
      { populate: ['term', 'careerSubject', 'careerSubject.subject'] },
    );
  }
}
