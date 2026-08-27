import { TermPeriod } from '../Term/term.entity';

export interface ParsedRow {
  raw: string;
  subjectName: string;
  siuCode: string;
  date: Date;
  type: string;
  grade?: number;
  result?: string;
}

export interface ParsedAttempt {
  siuCode: string;
  subjectName: string;
  regularidadDate: Date;
  rows: ParsedRow[];
}

export type ImportStatus = 'cursada' | 'aprobada' | 'desaprobada';

export interface ResolvedAttempt {
  siuCode: string;
  subjectName: string;
  regularidadDate: Date;
  status: ImportStatus;
  grade?: number;
  needsReview?: string;
}

export interface DiscardedAttempt {
  siuCode: string;
  subjectName: string;
  regularidadDate: Date;
  reason: string;
}

export interface InCourseSubject {
  siuCode: string;
  subjectName: string;
}

// Ej: "Análisis Matemático I (00054) 10/07/2025 Regularidad 10 Aprobado"
// Ej: "Algoritmos (01307) 10/08/2026 En curso"
const ROW_REGEX =
  /^(.+?)\s*\((\w+)\)\s+(\d{2}\/\d{2}\/\d{4})\s+([A-Za-zÁÉÍÓÚáéíóúñÑ ]+?)(?:\s+(\d+(?:\.\d+)?))?(?:\s+(Aprobado|Reprobado|Promocionado|Ausente))?$/;

const HEADER_LINE = /^Actividad\s+Fecha\s+Tipo\s+Nota\s+Resultado$/i;

function parseDate(ddmmyyyy: string): Date {
  const [day, month, year] = ddmmyyyy.split('/').map(Number);
  return new Date(year, month - 1, day);
}

export function parseAcademicHistoryText(text: string): {
  rows: ParsedRow[];
  unparsedLines: string[];
} {
  const rawLines = text
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0);

  const rows: ParsedRow[] = [];
  const unparsedLines: string[] = [];

  for (const line of rawLines) {
    if (HEADER_LINE.test(line)) continue;

    const match = line.match(ROW_REGEX);
    if (!match) {
      unparsedLines.push(line);
      continue;
    }

    const [, subjectName, siuCode, dateStr, type, gradeStr, result] = match;
    rows.push({
      raw: line,
      subjectName: subjectName.trim(),
      siuCode: siuCode.trim(),
      date: parseDate(dateStr),
      type: type.trim(),
      grade: gradeStr ? Number(gradeStr) : undefined,
      result: result?.trim(),
    });
  }

  return { rows, unparsedLines };
}

/**
 * Agrupa filas por (código SIU, fecha de la fila Regularidad) = "intento". Filas de
 * un mismo intento (Regularidad + Promocion/Examen del mismo día) se agrupan juntas;
 * filas "En curso" quedan en su propio grupo.
 */
export function groupIntoAttempts(rows: ParsedRow[]): {
  attempts: ParsedAttempt[];
  inCourse: InCourseSubject[];
} {
  const bySubject = new Map<string, ParsedRow[]>();
  for (const row of rows) {
    const list = bySubject.get(row.siuCode) || [];
    list.push(row);
    bySubject.set(row.siuCode, list);
  }

  const attempts: ParsedAttempt[] = [];
  const inCourse: InCourseSubject[] = [];

  for (const [siuCode, subjectRows] of bySubject) {
    const subjectName = subjectRows[0].subjectName;

    const enCurso = subjectRows.filter((r) => /en curso/i.test(r.type));
    if (enCurso.length > 0) {
      inCourse.push({ siuCode, subjectName });
    }

    const regularidadRows = subjectRows.filter((r) => /^regularidad/i.test(r.type));
    for (const regRow of regularidadRows) {
      // Todas las filas del mismo día que esta Regularidad (Promocion/Examen que la cierran)
      const sameDayRows = subjectRows.filter(
        (r) => r.date.getTime() === regRow.date.getTime(),
      );
      attempts.push({
        siuCode,
        subjectName,
        regularidadDate: regRow.date,
        rows: sameDayRows,
      });
    }
  }

  return { attempts, inCourse };
}

/**
 * Resuelve el estado de un intento según las reglas de negocio: Regularidad+Promocion
 * (u otro tipo distinto de Regularidad) el mismo día con resultado Aprobado/Promocionado
 * => aprobada; solo Regularidad Aprobado => cursada; Regularidad Reprobado =>
 * desaprobada (se propone igual, para reflejar que hay que recursar); cualquier otra
 * combinación => needsReview, nunca se descarta en silencio.
 */
export function resolveAttemptStatus(
  attempt: ParsedAttempt,
): ResolvedAttempt | DiscardedAttempt {
  const regRow = attempt.rows.find((r) => /^regularidad/i.test(r.type));
  if (!regRow) {
    return {
      siuCode: attempt.siuCode,
      subjectName: attempt.subjectName,
      regularidadDate: attempt.regularidadDate,
      reason: 'No se encontró la fila de Regularidad de este intento',
    };
  }

  if (regRow.result === 'Reprobado') {
    return {
      siuCode: attempt.siuCode,
      subjectName: attempt.subjectName,
      regularidadDate: attempt.regularidadDate,
      status: 'desaprobada',
      grade: regRow.grade,
    };
  }

  if (regRow.result !== 'Aprobado') {
    return {
      siuCode: attempt.siuCode,
      subjectName: attempt.subjectName,
      regularidadDate: attempt.regularidadDate,
      status: 'cursada',
      grade: regRow.grade,
      needsReview: `Resultado de Regularidad inesperado: "${regRow.result ?? 'sin resultado'}"`,
    } as ResolvedAttempt;
  }

  const closingRow = attempt.rows.find(
    (r) =>
      r !== regRow &&
      !/^regularidad/i.test(r.type) &&
      (r.result === 'Aprobado' || r.result === 'Promocionado'),
  );

  if (closingRow) {
    return {
      siuCode: attempt.siuCode,
      subjectName: attempt.subjectName,
      regularidadDate: attempt.regularidadDate,
      status: 'aprobada',
      grade: closingRow.grade,
    };
  }

  return {
    siuCode: attempt.siuCode,
    subjectName: attempt.subjectName,
    regularidadDate: attempt.regularidadDate,
    status: 'cursada',
    grade: regRow.grade,
  };
}

export function isDiscarded(
  x: ResolvedAttempt | DiscardedAttempt,
): x is DiscardedAttempt {
  return !('status' in x);
}

/**
 * Todos los intentos resueltos (aprobada/cursada/desaprobada) se proponen para
 * importar, cada uno en su propio cuatrimestre — una recursada (ej. desaprobada en
 * 2024, aprobada en 2025) queda reflejada en ambos cuatrimestres. Solo se descartan
 * los intentos sin fila de Regularidad válida.
 */
export function pickCurrentAttemptPerSubject(
  resolved: Array<ResolvedAttempt | DiscardedAttempt>,
): { toImport: ResolvedAttempt[]; discarded: DiscardedAttempt[] } {
  const toImport: ResolvedAttempt[] = [];
  const discarded: DiscardedAttempt[] = [];

  for (const item of resolved) {
    if (isDiscarded(item)) {
      discarded.push(item);
    } else {
      toImport.push(item);
    }
  }

  return { toImport, discarded };
}

/**
 * Infiere year/period a partir de la fecha de Regularidad del intento vigente.
 * Marzo-julio => 1er cuatri; agosto-diciembre => 2do cuatri; enero-febrero => 2do
 * cuatri del año anterior (marcado como incierto: una mesa de examen de febrero
 * podría corresponder a una cursada de cualquier cuatrimestre previo).
 */
export function inferTerm(date: Date): {
  year: number;
  period: TermPeriod;
  periodUncertain: boolean;
} {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();

  if (month >= 3 && month <= 7) {
    return { year, period: TermPeriod.FIRST, periodUncertain: false };
  }
  if (month >= 8 && month <= 12) {
    return { year, period: TermPeriod.SECOND, periodUncertain: false };
  }
  // enero o febrero
  return { year: year - 1, period: TermPeriod.SECOND, periodUncertain: true };
}

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export interface MatchableCareerSubject {
  careerSubjectId: number;
  code?: string;
  name: string;
}

export interface MatchResult {
  careerSubjectId?: number;
  matchMethod: 'code' | 'name' | 'none';
}

/**
 * Matching en cascada: código SIU exacto primero, nombre normalizado como fallback.
 */
export function matchSubject(
  siuCode: string,
  subjectName: string,
  candidates: MatchableCareerSubject[],
): MatchResult {
  const byCode = candidates.find((c) => c.code?.trim() === siuCode.trim());
  if (byCode) {
    return { careerSubjectId: byCode.careerSubjectId, matchMethod: 'code' };
  }

  const normalizedTarget = normalizeName(subjectName);
  const byName = candidates.find((c) => normalizeName(c.name) === normalizedTarget);
  if (byName) {
    return { careerSubjectId: byName.careerSubjectId, matchMethod: 'name' };
  }

  return { matchMethod: 'none' };
}
