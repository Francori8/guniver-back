import { Injectable, NotFoundException } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { TermService } from '../Term/term.service';
import { TermRepository } from '../Term/term.repository';
import { TermPeriod } from '../Term/term.entity';
import { SubjectProgressService } from '../SubjectProgress/subject_progress.service';
import { SubjectProgressRepository } from '../SubjectProgress/subject_progress.repository';
import { SubjectProgressStatus } from '../SubjectProgress/subject_progress.entity';
import { CareerSubjectRepository } from '../CareerSubject/career_subject.repository';
import { StudentProfileRepository } from '../Profile/repository/student_profile.repository';
import {
  parseAcademicHistoryText,
  groupIntoAttempts,
  resolveAttemptStatus,
  pickCurrentAttemptPerSubject,
  inferTerm,
  matchSubject,
  MatchableCareerSubject,
  extractCareerName,
  normalizeName,
} from './academic_history.parser';
import {
  PreviewResponseDto,
  PreviewTermGroupDto,
} from './dto/preview_response.dto';
import { ConfirmImportDto } from './dto/confirm_import.dto';
import { ConfirmImportResultDto } from './dto/confirm_import_result.dto';

@Injectable()
export class AcademicHistoryService {
  constructor(
    private readonly termService: TermService,
    private readonly termRepository: TermRepository,
    private readonly subjectProgressService: SubjectProgressService,
    private readonly subjectProgressRepository: SubjectProgressRepository,
    private readonly careerSubjectRepository: CareerSubjectRepository,
    private readonly studentProfileRepository: StudentProfileRepository,
  ) {}

  async buildPreview(userId: number, buffer: Buffer): Promise<PreviewResponseDto> {
    const studentProfiles = await this.studentProfileRepository.findByUserId(userId);
    if (studentProfiles.length === 0) {
      throw new NotFoundException('No tenés ningún perfil de estudiante');
    }

    // Subjects ya aprobadas por el usuario en CUALQUIER carrera — si una materia
    // compartida (ej. "Matemática 1" vinculada a Lic. y Tec.) ya está aprobada en
    // otra carrera, se propone igual (por si el usuario quiere el registro en esta
    // carrera también) pero excluida por defecto, con aviso.
    const allUserProgresses = await this.subjectProgressRepository.findByUserAcrossCareers(
      userId,
    );
    const approvedSubjectIds = new Set(
      allUserProgresses
        .filter((p) => p.status === SubjectProgressStatus.APROBADA)
        .map((p) => p.careerSubject.subject.id),
    );

    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    await parser.destroy();

    const { rows, unparsedLines } = parseAcademicHistoryText(textResult.text);
    const { attempts, inCourse } = groupIntoAttempts(rows);
    const resolved = attempts.map(resolveAttemptStatus);
    const { toImport, discarded } = pickCurrentAttemptPerSubject(resolved);

    // El PDF trae "Propuesta: <carrera>" en el encabezado — si matchea con una única
    // carrera entre los perfiles del usuario, se restringe el matching de materias a
    // esa carrera sola (evita falsos cruces si dos carreras del usuario comparten
    // nombres de materia) y se informa al frontend qué carrera se detectó. Si no
    // matchea ninguna (o el texto no trae la línea), se sigue igual que antes con
    // todas las carreras del usuario combinadas, sin bloquear el import.
    const detectedCareerName = extractCareerName(textResult.text);
    const detectedProfile = detectedCareerName
      ? studentProfiles.find(
          (p) => normalizeName(p.career.name) === normalizeName(detectedCareerName),
        )
      : undefined;
    const profilesToUse = detectedProfile ? [detectedProfile] : studentProfiles;

    // candidatos de todas las carreras del usuario, combinados para el matching
    const candidates: (MatchableCareerSubject & {
      careerId: number;
      careerName: string;
      subjectId: number;
    })[] = [];
    const existingTermsByProfile = new Map<number, Awaited<ReturnType<TermRepository['findByStudentProfile']>>>();
    for (const profile of profilesToUse) {
      const careerSubjects = await this.careerSubjectRepository.findByCareer(
        profile.career.id,
      );
      for (const cs of careerSubjects) {
        candidates.push({
          careerSubjectId: cs.id,
          code: cs.subject.code,
          name: cs.subject.name,
          careerId: profile.career.id,
          careerName: profile.career.name,
          subjectId: cs.subject.id,
        });
      }
      existingTermsByProfile.set(
        profile.career.id,
        await this.termRepository.findByStudentProfile(profile.id),
      );
    }

    const groupsByKey = new Map<string, PreviewTermGroupDto>();
    const unmatched: PreviewResponseDto['unmatched'] = [];

    for (const item of toImport) {
      const { year, period, periodUncertain } = inferTerm(item.regularidadDate);
      const match = matchSubject(item.siuCode, item.subjectName, candidates);

      if (match.matchMethod === 'none') {
        unmatched.push({ siuCode: item.siuCode, subjectName: item.subjectName });
        continue;
      }

      const matchedCandidate = candidates.find(
        (c) => c.careerSubjectId === match.careerSubjectId,
      )!;

      const key = `${matchedCandidate.careerId}-${year}-${period}`;
      let group = groupsByKey.get(key);
      if (!group) {
        const existingTerms = existingTermsByProfile.get(matchedCandidate.careerId) ?? [];
        const existingTerm = existingTerms.find(
          (t) => t.year === year && t.period === period,
        );
        group = {
          careerId: matchedCandidate.careerId,
          careerName: matchedCandidate.careerName,
          year,
          period,
          alreadyExists: !!existingTerm,
          existingTermId: existingTerm?.id,
          rows: [],
        };
        groupsByKey.set(key, group);
      }

      group.rows.push({
        siuCode: item.siuCode,
        subjectName: item.subjectName,
        careerSubjectId: match.careerSubjectId,
        matchedSubjectName: matchedCandidate.name,
        matchMethod: match.matchMethod,
        status: item.status,
        grade: item.grade,
        regularidadDate: item.regularidadDate,
        needsReview: item.needsReview,
        periodUncertain,
        alreadyApprovedElsewhere: approvedSubjectIds.has(matchedCandidate.subjectId),
      });
    }

    // Materias "En curso" se proponen igual, como 'cursada' sin nota, en el
    // cuatrimestre actual (inferido de hoy, no de una fecha de Regularidad que no
    // tienen) — el usuario completa la nota/estado final cuando termine de cursar.
    const { year: currentYear, period: currentPeriod } = inferTerm(new Date());
    const stillUnmatched: PreviewResponseDto['unmatched'] = [];

    for (const ic of inCourse) {
      const match = matchSubject(ic.siuCode, ic.subjectName, candidates);

      if (match.matchMethod === 'none') {
        stillUnmatched.push({ siuCode: ic.siuCode, subjectName: ic.subjectName });
        continue;
      }

      const matchedCandidate = candidates.find(
        (c) => c.careerSubjectId === match.careerSubjectId,
      )!;

      const key = `${matchedCandidate.careerId}-${currentYear}-${currentPeriod}`;
      let group = groupsByKey.get(key);
      if (!group) {
        const existingTerms = existingTermsByProfile.get(matchedCandidate.careerId) ?? [];
        const existingTerm = existingTerms.find(
          (t) => t.year === currentYear && t.period === currentPeriod,
        );
        group = {
          careerId: matchedCandidate.careerId,
          careerName: matchedCandidate.careerName,
          year: currentYear,
          period: currentPeriod,
          alreadyExists: !!existingTerm,
          existingTermId: existingTerm?.id,
          rows: [],
        };
        groupsByKey.set(key, group);
      }

      group.rows.push({
        siuCode: ic.siuCode,
        subjectName: ic.subjectName,
        careerSubjectId: match.careerSubjectId,
        matchedSubjectName: matchedCandidate.name,
        matchMethod: match.matchMethod,
        status: 'cursada',
        regularidadDate: new Date(),
        needsReview: 'Materia en curso: se importa como cursada, sin nota. Completala cuando termine el cuatrimestre.',
      });
    }
    unmatched.push(...stillUnmatched);

    return new PreviewResponseDto({
      termGroups: Array.from(groupsByKey.values()).sort(
        (a, b) => b.year - a.year || b.period.localeCompare(a.period),
      ),
      unmatched,
      discarded: discarded.map((d) => ({
        siuCode: d.siuCode,
        subjectName: d.subjectName,
        reason: d.reason,
      })),
      unparsedLines,
      detectedCareerName,
      detectedCareerId: detectedProfile?.career.id,
    });
  }

  async confirmImport(
    userId: number,
    dto: ConfirmImportDto,
  ): Promise<ConfirmImportResultDto> {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const group of dto.termGroups) {
      let termId = group.existingTermId;

      if (!termId) {
        try {
          const term = await this.termService.create(userId, {
            careerId: group.careerId,
            year: group.year,
            period: group.period as TermPeriod,
          });
          termId = term.id;
        } catch (err: any) {
          errors.push(
            `No se pudo crear el cuatrimestre ${group.year}-${group.period}: ${err.message}`,
          );
          continue;
        }
      }

      for (const row of group.rows) {
        if (row.excluded || !row.careerSubjectId) continue;

        const existing = await this.subjectProgressRepository.findByTermAndCareerSubject(
          termId,
          row.careerSubjectId,
        );
        if (existing) {
          skipped++;
          continue;
        }

        try {
          const statusMap: Record<typeof row.status, SubjectProgressStatus> = {
            aprobada: SubjectProgressStatus.APROBADA,
            cursada: SubjectProgressStatus.CURSADA,
            desaprobada: SubjectProgressStatus.DESAPROBADA,
          };
          await this.subjectProgressService.create(termId, userId, {
            careerSubjectId: row.careerSubjectId,
            status: statusMap[row.status],
            grade: row.grade,
          });
          created++;
        } catch (err: any) {
          errors.push(
            `No se pudo importar la materia (careerSubjectId ${row.careerSubjectId}): ${err.message}`,
          );
        }
      }
    }

    return new ConfirmImportResultDto({ created, skipped, errors });
  }
}
