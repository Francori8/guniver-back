import * as cheerio from 'cheerio';

export type ParsedRequirementKind = 'cursar' | 'aprobar';

export interface ParsedRequirementRow {
  raw: string;
  // Nombre de la materia requisito con su código, ej. "Programación con Objetos II
  // (01037)" — o el nombre del módulo si el requisito es de tipo módulo (sin código).
  requisitoText: string;
  isModule: boolean;
  condicionText: string;
}

export interface ParsedRequirementSection {
  kind: ParsedRequirementKind;
  // Sólo la primera opción (Opción 1) — el sistema no soporta múltiples opciones
  // por correlativa todavía; se informa aparte si el HTML traía más.
  rows: ParsedRequirementRow[];
  extraOptionsIgnored: number;
}

/**
 * El endpoint de correlativas del SIU responde con Content-Type text/html, pero el
 * cuerpo real es un JSON `{"cod":"1","cont":"<html escapado>"}` — la pestaña Network
 * de DevTools muestra ese JSON crudo tal cual (con \", \n, ó, etc.), así que lo
 * que el admin copia y pega es ese texto, no HTML puro. El servidor del SIU emite
 * ese JSON con saltos de línea reales sin escapar dentro del string (JSON
 * técnicamente inválido), así que JSON.parse falla — se extrae el contenido de
 * "cont" con una regex tolerante en vez de parsear como JSON estricto.
 */
function unwrapSiuJsonResponse(input: string): string {
  const trimmed = input.trim();
  if (!trimmed.startsWith('{') || !trimmed.includes('"cont"')) return input;

  const match = trimmed.match(/"cont"\s*:\s*"([\s\S]*)"\s*\}\s*$/);
  if (!match) return input;

  return match[1]
    .replace(/\\"/g, '"')
    .replace(/\\\//g, '/')
    .replace(/\\n/g, '\n')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    );
}

/**
 * Parsea el fragmento HTML que devuelve el endpoint de "Verificar correlativas" del
 * SIU Guaraní (copiado manualmente desde DevTools por el admin, materia por
 * materia) — dos secciones "Para cursar"/"Para aprobar", cada una con una o más
 * tablas "Opción N" de filas Requisito/Condición.
 */
export function parseRequirementsHtml(html: string): {
  sections: ParsedRequirementSection[];
  unrecognizedText: string[];
} {
  const $ = cheerio.load(unwrapSiuJsonResponse(html));
  const sections: ParsedRequirementSection[] = [];
  const unrecognizedText: string[] = [];

  // Cada bloque "Para cursar"/"Para aprobar" es un <h3> seguido, en algún punto del
  // documento, de una o más <table class="table-correlativas">. Se recorre en orden
  // de aparición: todo <table class="table-correlativas"> hasta el próximo <h3> con
  // texto "Para cursar"/"Para aprobar" pertenece a la sección actual.
  let currentKind: ParsedRequirementKind | null = null;
  let optionCountForCurrentKind = 0;
  let currentSection: ParsedRequirementSection | null = null;

  $('h3, table.table-correlativas').each((_, el) => {
    const tag = $(el).prop('tagName')?.toLowerCase();

    if (tag === 'h3') {
      const text = $(el).text().trim();
      if (/^Para cursar$/i.test(text)) {
        currentKind = 'cursar';
        optionCountForCurrentKind = 0;
        currentSection = null;
      } else if (/^Para aprobar$/i.test(text)) {
        currentKind = 'aprobar';
        optionCountForCurrentKind = 0;
        currentSection = null;
      }
      return;
    }

    if (tag === 'table' && currentKind) {
      optionCountForCurrentKind++;

      if (optionCountForCurrentKind === 1) {
        currentSection = { kind: currentKind, rows: [], extraOptionsIgnored: 0 };
        sections.push(currentSection);

        $(el)
          .find('tr')
          .each((__, tr) => {
            const cells = $(tr).find('td');
            if (cells.length < 2) return; // fila de encabezado ("Requisito"/"Condición")

            const requisitoCell = $(cells[0]);
            const condicionCell = $(cells[1]);
            const requisitoText = requisitoCell.text().replace(/\s+/g, ' ').trim();
            const condicionText = condicionCell.text().replace(/\s+/g, ' ').trim();
            const isModule = /^M[oó]dulo:/i.test(requisitoText);

            sections[sections.length - 1].rows.push({
              raw: `${requisitoText} | ${condicionText}`,
              requisitoText: isModule
                ? requisitoText.replace(/^M[oó]dulo:\s*/i, '').trim()
                : requisitoText,
              isModule,
              condicionText,
            });
          });
      } else if (currentSection) {
        // Opción 2, 3, ... — se cuenta pero no se procesa (fuera de alcance).
        currentSection.extraOptionsIgnored++;
      }
    }
  });

  return { sections, unrecognizedText };
}

const SUBJECT_CODE_REGEX = /^(.+?)\s*\((\w+)\)\s*$/;

/**
 * Limpia el nombre de módulo tal como aparece en la celda "Requisito" del HTML de
 * correlativas, ej. "Cursos Básicos de la carrera: Lic en Informatica (2015-19)
 * (W15BO)" -> "Cursos Básicos de la carrera: Lic en Informatica (2015-19)" — le saca
 * el código de sede/versión pegado al final entre paréntesis, y el sufijo ": Depto.
 * de..." cuando existe (mismo patrón que StudyPlanImport, pero sin el prefijo
 * "MóDULO: / .../" que trae el Excel, así que la limpieza es distinta acá).
 */
function cleanModuleName(raw: string): string {
  const withoutTrailingCode = raw.replace(/\s*\([A-Za-z0-9]+\)\s*$/, '');
  const colonMatch = withoutTrailingCode.match(/^(.+?)\s+:\s+.+$/);
  return (colonMatch ? colonMatch[1] : withoutTrailingCode).trim();
}

export interface ParsedRequirementItem {
  // 'subject_approved' | 'module_credits' | 'module_complete' | 'unrecognized'
  kind: 'subject_approved' | 'module_credits' | 'module_complete' | 'unrecognized';
  subjectName?: string;
  subjectCode?: string;
  moduleName?: string;
  requiredCredits?: number;
  rawCondicion: string;
}

/**
 * Interpreta una fila (Requisito, Condición) ya separada por parseRequirementsHtml
 * en un ítem de requisito tipado. Condiciones no reconocidas se marcan
 * explícitamente como 'unrecognized' — nunca se asume un tipo por descarte.
 */
export function interpretRequirementRow(
  row: ParsedRequirementRow,
): ParsedRequirementItem {
  if (row.isModule) {
    const moduleName = cleanModuleName(row.requisitoText);
    const creditsMatch = row.condicionText.match(/Obtener\s+(\d+)\s+cr[eé]ditos/i);
    if (creditsMatch) {
      return {
        kind: 'module_credits',
        moduleName,
        requiredCredits: Number(creditsMatch[1]),
        rawCondicion: row.condicionText,
      };
    }
    if (/^Todas las Actividades Aprobadas$/i.test(row.condicionText)) {
      return {
        kind: 'module_complete',
        moduleName,
        rawCondicion: row.condicionText,
      };
    }
    return { kind: 'unrecognized', moduleName, rawCondicion: row.condicionText };
  }

  const subjectMatch = row.requisitoText.match(SUBJECT_CODE_REGEX);
  if (subjectMatch && /^Aprobada$/i.test(row.condicionText)) {
    return {
      kind: 'subject_approved',
      subjectName: subjectMatch[1].trim(),
      subjectCode: subjectMatch[2].trim(),
      rawCondicion: row.condicionText,
    };
  }

  return {
    kind: 'unrecognized',
    subjectName: row.requisitoText,
    rawCondicion: row.condicionText,
  };
}
