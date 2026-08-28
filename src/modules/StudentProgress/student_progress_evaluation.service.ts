import { Injectable, NotFoundException } from '@nestjs/common';
import { CareerTreeService } from '../CareerTree/career_tree.service';
import { RequirementGroupRepository } from '../Requirement/requirement_group.repository';
import { RequirementGroup, RequirementKind } from '../Requirement/requirement_group.entity';
import { RequirementItemType } from '../Requirement/requirement_item.entity';
import { StudentProfileRepository } from '../Profile/repository/student_profile.repository';
import { SubjectProgressRepository } from '../SubjectProgress/subject_progress.repository';
import { SubjectProgress, SubjectProgressStatus } from '../SubjectProgress/subject_progress.entity';
import { CareerTreeWithProgressResponseDto } from './dto/career_tree_with_progress.response.dto';

const PERIOD_ORDER: Record<string, number> = { first: 1, second: 2 };

@Injectable()
export class StudentProgressEvaluationService {
  constructor(
    private readonly careerTreeService: CareerTreeService,
    private readonly requirementGroupRepository: RequirementGroupRepository,
    private readonly studentProfileRepository: StudentProfileRepository,
    private readonly subjectProgressRepository: SubjectProgressRepository,
  ) {}

  /**
   * Toma, por cada careerSubject, el SubjectProgress con el term más reciente
   * (year*10 + periodOrder) como estado "vigente" — necesario porque una materia
   * recursada puede tener varias filas (una por term) para la misma careerSubject.
   */
  private buildCurrentStatusMap(
    progresses: SubjectProgress[],
  ): Map<number, SubjectProgress> {
    const byCareerSubject = new Map<number, SubjectProgress>();
    for (const progress of progresses) {
      const csId = progress.careerSubject.id;
      const existing = byCareerSubject.get(csId);
      if (!existing) {
        byCareerSubject.set(csId, progress);
        continue;
      }
      const rank = (p: SubjectProgress) =>
        p.term.year * 10 + (PERIOD_ORDER[p.term.period] ?? 0);
      if (rank(progress) > rank(existing)) {
        byCareerSubject.set(csId, progress);
      }
    }
    return byCareerSubject;
  }

  /**
   * Subjects aprobadas por el usuario en CUALQUIER carrera (por subjectId) — permite
   * que una materia compartida entre carreras (misma Subject vinculada a más de un
   * CareerSubject, ej. "Matemática 1" en Licenciatura y Tecnicatura) se refleje como
   * aprobada en todas, aunque el SubjectProgress se haya cargado en una sola.
   */
  private buildApprovedSubjectIdsAcrossCareers(
    allUserProgresses: SubjectProgress[],
  ): Set<number> {
    const bySubject = new Map<number, SubjectProgress[]>();
    for (const progress of allUserProgresses) {
      const subjectId = progress.careerSubject.subject.id;
      const list = bySubject.get(subjectId) || [];
      list.push(progress);
      bySubject.set(subjectId, list);
    }

    const approved = new Set<number>();
    for (const [subjectId, list] of bySubject) {
      const byCareerSubject = this.buildCurrentStatusMap(list);
      const anyApproved = Array.from(byCareerSubject.values()).some(
        (p) => p.status === SubjectProgressStatus.APROBADA,
      );
      if (anyApproved) approved.add(subjectId);
    }
    return approved;
  }

  private evaluateGroup(
    group: RequirementGroup,
    currentStatus: Map<number, SubjectProgressStatus>,
    approvedCreditsByModule: Map<number, number>,
    approvedCountByModule: Map<number, number>,
    totalObligatoryByModule: Map<number, number>,
  ): boolean {
    return group.items.getItems().every((item) => {
      switch (item.type) {
        case RequirementItemType.SUBJECT_APPROVED:
          return (
            !!item.targetCareerSubject &&
            currentStatus.get(item.targetCareerSubject.id) ===
              SubjectProgressStatus.APROBADA
          );
        case RequirementItemType.MODULE_CREDITS:
          return (
            !!item.targetModule &&
            (approvedCreditsByModule.get(item.targetModule.id) ?? 0) >=
              (item.requiredCredits ?? Infinity)
          );
        case RequirementItemType.MODULE_COMPLETE:
          if (!item.targetModule) return false;
          const total = totalObligatoryByModule.get(item.targetModule.id) ?? 0;
          const approved = approvedCountByModule.get(item.targetModule.id) ?? 0;
          return total > 0 && approved >= total;
        default:
          return false;
      }
    });
  }

  private evaluateKind(
    groups: RequirementGroup[],
    careerSubjectId: number,
    kind: RequirementKind,
    currentStatus: Map<number, SubjectProgressStatus>,
    approvedCreditsByModule: Map<number, number>,
    approvedCountByModule: Map<number, number>,
    totalObligatoryByModule: Map<number, number>,
  ): boolean {
    const relevant = groups.filter(
      (g) => g.careerSubject.id === careerSubjectId && g.kind === kind,
    );
    if (relevant.length === 0) return true; // sin requisitos, habilitada trivialmente
    return relevant.some((group) =>
      this.evaluateGroup(
        group,
        currentStatus,
        approvedCreditsByModule,
        approvedCountByModule,
        totalObligatoryByModule,
      ),
    );
  }

  /**
   * Arma el estado "vigente" por careerSubject y los acumulados de créditos/
   * conteo por módulo — compartido entre el árbol de progreso real y la
   * simulación de "próximo cuatri" (simulateApproved trata cursada/pendiente_
   * aprobacion como si ya estuvieran aprobadas, para proyectar qué se habilita
   * si el cuatri actual sale bien).
   */
  private async buildEvaluationState(
    careerId: number,
    userId: number,
    simulateApproved: boolean,
  ) {
    const studentProfile = await this.studentProfileRepository.findByUserAndCareer(
      userId,
      careerId,
    );
    if (!studentProfile) {
      throw new NotFoundException(
        `No tenés un perfil de estudiante en la carrera ${careerId}`,
      );
    }

    const tree = await this.careerTreeService.getTree(careerId);
    const allGroups = await this.requirementGroupRepository.findByCareer(careerId);
    const progresses = await this.subjectProgressRepository.findByStudentProfileAndCareer(
      studentProfile.id,
      careerId,
    );
    const allUserProgresses = await this.subjectProgressRepository.findByUserAcrossCareers(
      userId,
    );

    const currentProgressByCareerSubject = this.buildCurrentStatusMap(progresses);
    const approvedSubjectIdsAcrossCareers =
      this.buildApprovedSubjectIdsAcrossCareers(allUserProgresses);
    const currentStatus = new Map<number, SubjectProgressStatus>();
    for (const [csId, progress] of currentProgressByCareerSubject) {
      currentStatus.set(csId, progress.status);
    }
    for (const subject of tree.subjects) {
      if (currentStatus.has(subject.id)) continue;
      if (approvedSubjectIdsAcrossCareers.has(subject.subjectId)) {
        currentStatus.set(subject.id, SubjectProgressStatus.APROBADA);
      }
    }

    if (simulateApproved) {
      for (const [csId, status] of currentStatus) {
        if (
          status === SubjectProgressStatus.CURSADA ||
          status === SubjectProgressStatus.PENDIENTE_APROBACION
        ) {
          currentStatus.set(csId, SubjectProgressStatus.APROBADA);
        }
      }
    }

    const approvedCreditsByModule = new Map<number, number>();
    const approvedCountByModule = new Map<number, number>();
    const totalObligatoryByModule = new Map<number, number>();

    for (const subject of tree.subjects) {
      if (!subject.module) continue;
      const moduleId = subject.module.id;
      const moduleInfo = tree.modules.find((m) => m.id === moduleId);
      if (moduleInfo?.type === 'obligatorio') {
        totalObligatoryByModule.set(
          moduleId,
          (totalObligatoryByModule.get(moduleId) ?? 0) + 1,
        );
      }
      if (currentStatus.get(subject.id) === SubjectProgressStatus.APROBADA) {
        approvedCreditsByModule.set(
          moduleId,
          (approvedCreditsByModule.get(moduleId) ?? 0) + subject.credits,
        );
        approvedCountByModule.set(
          moduleId,
          (approvedCountByModule.get(moduleId) ?? 0) + 1,
        );
      }
    }

    return {
      tree,
      allGroups,
      currentStatus,
      currentProgressByCareerSubject,
      approvedCreditsByModule,
      approvedCountByModule,
      totalObligatoryByModule,
    };
  }

  async getTreeWithProgress(
    careerId: number,
    userId: number,
  ): Promise<CareerTreeWithProgressResponseDto> {
    const {
      tree,
      allGroups,
      currentStatus,
      currentProgressByCareerSubject,
      approvedCreditsByModule,
      approvedCountByModule,
      totalObligatoryByModule,
    } = await this.buildEvaluationState(careerId, userId, false);

    const subjects = tree.subjects.map((subject) => {
      const status =
        currentStatus.get(subject.id) ?? SubjectProgressStatus.SIN_CURSAR;
      const currentProgress = currentProgressByCareerSubject.get(subject.id);

      return {
        ...subject,
        progress: {
          status,
          isException: currentProgress?.isException,
          enabledToCursar: this.evaluateKind(
            allGroups,
            subject.id,
            RequirementKind.CURSAR,
            currentStatus,
            approvedCreditsByModule,
            approvedCountByModule,
            totalObligatoryByModule,
          ),
          enabledToAprobar: this.evaluateKind(
            allGroups,
            subject.id,
            RequirementKind.APROBAR,
            currentStatus,
            approvedCreditsByModule,
            approvedCountByModule,
            totalObligatoryByModule,
          ),
        },
      };
    });

    return new CareerTreeWithProgressResponseDto({
      career: tree.career,
      modules: tree.modules,
      subjects,
    });
  }

  /**
   * Simula "¿qué se habilita para cursar si apruebo todo lo que hoy está
   * cursada/pendiente de aprobación?" — sirve para planificar el próximo
   * cuatrimestre sin esperar a que cierren las notas. Devuelve el árbol
   * completo (mismo shape que getTreeWithProgress) pero evaluado con ese
   * estado hipotético; en `progress.status` se ve el estado REAL actual
   * (no el simulado) para no confundir "aprobada de verdad" con "asumida".
   */
  async getNextTermPlan(
    careerId: number,
    userId: number,
  ): Promise<CareerTreeWithProgressResponseDto> {
    const {
      tree,
      allGroups,
      currentStatus: simulatedStatus,
      currentProgressByCareerSubject,
      approvedCreditsByModule,
      approvedCountByModule,
      totalObligatoryByModule,
    } = await this.buildEvaluationState(careerId, userId, true);

    const subjects = tree.subjects.map((subject) => {
      const realProgress = currentProgressByCareerSubject.get(subject.id);
      const realStatus = realProgress?.status ?? SubjectProgressStatus.SIN_CURSAR;

      return {
        ...subject,
        progress: {
          status: realStatus,
          isException: realProgress?.isException,
          enabledToCursar: this.evaluateKind(
            allGroups,
            subject.id,
            RequirementKind.CURSAR,
            simulatedStatus,
            approvedCreditsByModule,
            approvedCountByModule,
            totalObligatoryByModule,
          ),
          enabledToAprobar: this.evaluateKind(
            allGroups,
            subject.id,
            RequirementKind.APROBAR,
            simulatedStatus,
            approvedCreditsByModule,
            approvedCountByModule,
            totalObligatoryByModule,
          ),
        },
      };
    });

    return new CareerTreeWithProgressResponseDto({
      career: tree.career,
      modules: tree.modules,
      subjects,
    });
  }
}
