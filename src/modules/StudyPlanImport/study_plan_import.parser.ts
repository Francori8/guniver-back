import * as XLSX from 'xlsx';

export interface ParsedModuleSection {
  name: string;
  rows: ParsedPlanRow[];
}

export interface ParsedPlanRow {
  raw: string;
  subjectName: string;
  code: string;
  credits: number;
}

// El SIU usa dos variantes de encabezado de sección, en una fila con una sola
// celda: "MóDULO: / Plan basico / Ciclo Introductorio : Depto. de Ciencia y Tec
// (X-W-P)" y "MATERIA GENéRICA: / Plan basico / Nucleo de Orientación - carrera:
// Lic en Informática (2019) / Núcleo de Orientación del Ciclo Superior - W".
const MODULE_HEADER_REGEX = /^(?:M[oó]DULO|MATERIA GEN[eé]RICA):\s*(.+)$/i;

// Fila de encabezado de columnas de una tabla, a ignorar.
const COLUMN_HEADER_ROW = ['Actividad', 'Tipo', 'Año', 'Período', 'Nota', 'Origen', 'Créditos', 'Puntaje'];

// Fila de materia: "Nombre (código)" en la primera celda, créditos en alguna de
// las últimas celdas numéricas (la columna "Créditos" varía de posición según
// cuántas columnas trae esa fila en particular).
const SUBJECT_NAME_CODE_REGEX = /^(.+?)\s*\((\w+)\)\s*$/;

function extractModuleName(headerText: string): string {
  // Primero se parte por "/" y se toma el último segmento — el nombre real del
  // módulo siempre es el segmento final, nunca el primero. Recién ahí se busca un
  // ":" que separe "nombre : depto./sede" (ej. "Ciclo Introductorio : Depto. de
  // Ciencia y Tec (X-W-P)"). Partir por ":" antes de por "/" corta mal nombres que
  // tienen su propio ":" interno sin ser separador, ej. "Cursos Avanzados de la
  // carr:Lic en Informática(2012-2015-19)" (sin espacio alrededor del ":") o
  // "Cursos Básicos de la carrera: Lic en Informatica (2015-19)".
  const segments = headerText.split('/').map((s) => s.trim());
  const lastSegment = segments[segments.length - 1] || headerText.trim();

  // Sólo se considera separador real un ": " con espacio después (patrón real
  // observado: "Nombre : Depto..."), no un ":" pegado a la palabra siguiente.
  const colonSeparatorMatch = lastSegment.match(/^(.+?)\s+:\s+(.+)$/);
  const withoutDeptSuffix = colonSeparatorMatch
    ? colonSeparatorMatch[1]
    : lastSegment;

  return withoutDeptSuffix.replace(/\s*-\s*[A-Za-z0-9]{1,3}$/, '').trim();
}

function isColumnHeaderRow(cells: string[]): boolean {
  return (
    cells.length >= COLUMN_HEADER_ROW.length &&
    COLUMN_HEADER_ROW.every((h, i) => cells[i]?.trim() === h)
  );
}

function extractCredits(cells: string[]): number {
  // La columna "Créditos" no está siempre en la misma posición porque algunas filas
  // traen menos celdas (sin Año/Período/Nota/Origen) — se toma el último valor
  // numérico con formato "N.NN" de la fila, que siempre es Créditos o Puntaje (en
  // caso de venir ambos, son iguales en la práctica observada).
  for (let i = cells.length - 1; i >= 0; i--) {
    const match = cells[i]?.trim().match(/^\d+(?:\.\d+)?$/);
    if (match) return Number(match[0]);
  }
  return 0;
}

/**
 * Parsea el Excel "Plan de estudios" que exporta el SIU Guaraní (hoja "Reporte"):
 * cada fila de una sola celda que matchea "MóDULO:"/"MATERIA GENéRICA:" abre una
 * nueva sección; las filas siguientes con "Nombre (código)" en la primera celda son
 * materias de esa sección, hasta la próxima sección. A diferencia del PDF (cuyo
 * texto extraído no preserva el layout visual de las tablas), el Excel trae una
 * fila real por materia sin ambigüedad de agrupamiento.
 */
export function parseStudyPlanWorkbook(buffer: Buffer): {
  sections: ParsedModuleSection[];
  unparsedRows: string[];
} {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: '',
  });

  const sections: ParsedModuleSection[] = [];
  const unparsedRows: string[] = [];
  let currentSection: ParsedModuleSection | null = null;

  for (const row of rows) {
    const cells = row.map((c) => (c ?? '').toString().trim());
    const nonEmpty = cells.filter((c) => c.length > 0);
    if (nonEmpty.length === 0) continue;

    if (nonEmpty.length === 1) {
      const moduleMatch = nonEmpty[0].match(MODULE_HEADER_REGEX);
      if (moduleMatch) {
        const name = extractModuleName(moduleMatch[1]);
        currentSection = sections.find((s) => s.name === name) ?? null;
        if (!currentSection) {
          currentSection = { name, rows: [] };
          sections.push(currentSection);
        }
        continue;
      }
      // Otras filas de una sola celda son metadata del documento (Universidad,
      // Alumno, Legajo, notas al pie con *, -, !, etc.) — se ignoran en silencio,
      // no aportan información de materias.
      continue;
    }

    if (isColumnHeaderRow(cells)) continue;

    const subjectMatch = cells[0]?.match(SUBJECT_NAME_CODE_REGEX);
    if (subjectMatch && cells[1] === 'Materia') {
      if (!currentSection) {
        unparsedRows.push(cells.join(' | '));
        continue;
      }
      currentSection.rows.push({
        raw: cells.join(' | '),
        subjectName: subjectMatch[1].trim(),
        code: subjectMatch[2].trim(),
        credits: extractCredits(cells),
      });
      continue;
    }

    unparsedRows.push(cells.join(' | '));
  }

  return { sections, unparsedRows };
}

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export interface MatchableSubject {
  subjectId: number;
  code?: string;
  name: string;
}

export interface SubjectMatchResult {
  subjectId?: number;
  matchMethod: 'code' | 'name' | 'none';
}

/**
 * Matching en cascada contra el catálogo GLOBAL de Subjects (no sólo de una carrera):
 * código SIU exacto primero, nombre normalizado como fallback — permite reusar una
 * Subject ya existente de otra carrera en vez de crear una duplicada.
 */
export function matchExistingSubject(
  code: string,
  name: string,
  candidates: MatchableSubject[],
): SubjectMatchResult {
  const byCode = candidates.find((c) => c.code?.trim() === code.trim());
  if (byCode) {
    return { subjectId: byCode.subjectId, matchMethod: 'code' };
  }

  const normalizedTarget = normalizeName(name);
  const byName = candidates.find((c) => normalizeName(c.name) === normalizedTarget);
  if (byName) {
    return { subjectId: byName.subjectId, matchMethod: 'name' };
  }

  return { matchMethod: 'none' };
}

export interface MatchableModule {
  moduleId: number;
  name: string;
}

export interface ModuleMatchResult {
  moduleId?: number;
  matchMethod: 'name' | 'none';
}

/**
 * Matching de módulo por nombre normalizado contra los StudyPlanModule ya existentes
 * de la carrera — si no matchea ninguno, se propone crear uno nuevo (el importador
 * nunca decide automáticamente si es obligatorio u optativo, eso lo define el admin).
 */
export function matchExistingModule(
  name: string,
  candidates: MatchableModule[],
): ModuleMatchResult {
  const normalizedTarget = normalizeName(name);
  const byName = candidates.find((c) => normalizeName(c.name) === normalizedTarget);
  if (byName) {
    return { moduleId: byName.moduleId, matchMethod: 'name' };
  }
  return { matchMethod: 'none' };
}
