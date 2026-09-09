export interface ParsedSlot {
  dayOfWeek: number; // 1=lunes .. 7=domingo
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  isVirtual: boolean;
}

export interface ParsedCommission {
  raw: string;
  subjectName: string;
  commission: string;
  modality?: string; // "Presencial" | "Virtual Asincrónica" | "Virtual Sincrónica" | etc, tal cual aparece
  slots: ParsedSlot[];
  // Franjas que no se pudieron interpretar (ej. "- Teórica", "Virtual" a secas sin
  // día/hora) — se listan para revisión manual en vez de descartar la comisión.
  unparsedScheduleText?: string;
}

const DAY_MAP: Record<string, number> = {
  lun: 1,
  mar: 2,
  mie: 3,
  mié: 3,
  jue: 4,
  vie: 5,
  sab: 6,
  sáb: 6,
  dom: 7,
};

// Ej: "Mar 10:00 a 12:59", "Jue 18:00 a 21:29 (Virtual)", "Jueves 08:30 a 12:29"
const SLOT_REGEX =
  /(Lun|Mar|Mi[eé]|Jue(?:ves)?|Vie|S[aá]b|Dom)\w*\s+(\d{1,2}:\d{2})\s+a\s+(\d{1,2}:\d{2})\s*(\(Virtual\))?/gi;

/**
 * Interpreta el texto de "Banda Horaria" de una fila, ej.
 * "Mar 10:00 a 12:59 / Mie 15:00 a 17:59 (Virtual)" -> dos ParsedSlot. Cada franja
 * puede traer su propio "(Virtual)" — el resto de la actividad puede ser presencial
 * aunque una franja puntual sea virtual (comisiones con teórica presencial y
 * práctica virtual en días distintos, visto en el PDF real).
 */
export function parseScheduleText(text: string): {
  slots: ParsedSlot[];
  unparsedText?: string;
} {
  const slots: ParsedSlot[] = [];
  let match: RegExpExecArray | null;
  let matchedLength = 0;
  SLOT_REGEX.lastIndex = 0;

  while ((match = SLOT_REGEX.exec(text)) !== null) {
    const [full, dayText, start, end, virtualMarker] = match;
    const dayKey = dayText.toLowerCase().slice(0, 3);
    const dayOfWeek = DAY_MAP[dayKey];
    if (!dayOfWeek) continue;

    matchedLength += full.length;
    slots.push({
      dayOfWeek,
      startTime: start.padStart(5, '0'),
      endTime: end.padStart(5, '0'),
      isVirtual: !!virtualMarker,
    });
  }

  const strippedLength = text.replace(/[\s/]/g, '').length;
  const coverage = matchedLength / Math.max(strippedLength, 1);
  const unparsedText = slots.length === 0 || coverage < 0.5 ? text : undefined;

  return { slots, unparsedText };
}

const METADATA_LINE_REGEX = new RegExp(
  [
    '^A[ñn]o Acad[eé]mico$',
    '^Per[ií]odo Lectivo$',
    '^Propuestas?$',
    '^\\d{4}$',
    '^\\d[eº°]?\\s*cuatrimestre$',
    '^[ÚU]LTIMA ACTUALIZACI[ÓO]N',
    '^Bernal$',
    '^Seg[uú]n oferta de',
    '^--\\s*\\d+\\s+of\\s+\\d+\\s*--$',
    '^Actividad\\s+Comisi[oó]n\\s+Banda Horaria',
    '^\\*.*simultaneidad de$', // nota al pie de "Seminarios..."
    '^carreras entre',
    '^en TPI',
  ].join('|'),
  'i',
);

/**
 * Parsea el texto plano que extrae pdf-parse de la grilla de oferta de comisiones
 * del SIU. El PDF es una tabla de 3 columnas (Actividad / Comisión / Banda
 * Horaria) pero al extraer texto se pierde esa estructura: filas cortas quedan en
 * una sola línea con tabs, filas largas se parten en 2-5 líneas sin tab, y una
 * misma "celda" puede quedar partida en dos líneas consecutivas.
 *
 * Estrategia: se normaliza todo el documento a un único string con separadores
 * de línea preservados, se descartan líneas de metadata, y se usa el patrón
 * "código (modalidad)" como ancla de cada fila — todo el texto entre el fin de
 * una ancla y el inicio de la siguiente es la "banda horaria" de la fila actual
 * más el "nombre de materia" de la fila siguiente (ambos se separan detectando
 * dónde termina el texto de horario, ya que ese texto solo contiene franjas
 * día/hora, "/", "(Virtual)" y espacios).
 */
export function parseCourseOfferingText(text: string): {
  commissions: ParsedCommission[];
  unrecognizedLines: string[];
} {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !METADATA_LINE_REGEX.test(l));

  // Se reconstruye un texto único, con las columnas tab-separadas convertidas en
  // saltos de línea propios, para que cada "celda" original quede en su propia
  // línea sin importar si el PDF la fusionó con la siguiente.
  const cellLines: string[] = [];
  for (const line of lines) {
    for (const cell of line.split('\t')) {
      const c = cell.trim();
      if (c.length > 0) cellLines.push(c);
    }
  }

  // Encuentra todas las anclas "comisión (modalidad)" en el flujo de líneas ya
  // separadas por celda. El caso normal tiene ambos en la misma línea, pero
  // cuando el código de comisión es largo (ej. "Inglés I" con código entre
  // paréntesis en vez de guionado) el PDF a veces separa "(código)" de
  // "(modalidad)" en dos líneas consecutivas — se soportan ambos casos.
  type Anchor = { lineIndex: number; endLineIndex: number; commission: string; modality: string };
  const anchors: Anchor[] = [];
  const FULL_ANCHOR_LINE = /^(.+?)\s*\(([^)]+)\)\*?$/;
  const CODE_ONLY_LINE = /^\(([^)]+)\)$/;
  const MODALITY_ONLY_LINE = /^\(([^)]+)\)\*?$/;

  const isSlotLike = (s: string) => {
    SLOT_REGEX.lastIndex = 0;
    const result = SLOT_REGEX.test(s);
    SLOT_REGEX.lastIndex = 0;
    return result;
  };

  for (let idx = 0; idx < cellLines.length; idx++) {
    const cellLine = cellLines[idx];
    const m = cellLine.match(FULL_ANCHOR_LINE);
    if (m && !isSlotLike(m[1]) && !/^\d{1,2}:\d{2}/.test(m[2])) {
      anchors.push({
        lineIndex: idx,
        endLineIndex: idx,
        commission: m[1].trim(),
        modality: m[2].trim(),
      });
      continue;
    }

    // Caso "(código)" solo en su línea, seguido de "(modalidad) ..." en la
    // siguiente — típico de "Inglés I (90000-C-18-G14)" / "(Virtual Asincrónica)".
    const codeOnly = cellLine.match(CODE_ONLY_LINE);
    if (codeOnly && !isSlotLike(codeOnly[1]) && idx + 1 < cellLines.length) {
      const nextLine = cellLines[idx + 1];
      const modalityMatch = nextLine.match(MODALITY_ONLY_LINE);
      if (modalityMatch) {
        anchors.push({
          lineIndex: idx,
          endLineIndex: idx + 1,
          commission: codeOnly[1].trim(),
          modality: modalityMatch[1].trim(),
        });
        idx++; // la línea de modalidad ya quedó consumida como parte del ancla
      }
    }
  }

  const commissions: ParsedCommission[] = [];
  const consumedLineIndexes = new Set<number>();

  for (let a = 0; a < anchors.length; a++) {
    const anchor = anchors[a];
    for (let li = anchor.lineIndex; li <= anchor.endLineIndex; li++) {
      consumedLineIndexes.add(li);
    }

    // Nombre de materia: todas las líneas entre el ancla anterior (o el inicio) y
    // esta ancla que NO fueron consumidas como horario de la fila anterior.
    const prevAnchorEndIndex = a > 0 ? anchors[a - 1].endLineIndex : -1;
    const nameLines: string[] = [];
    for (let li = prevAnchorEndIndex + 1; li < anchor.lineIndex; li++) {
      if (!consumedLineIndexes.has(li)) {
        nameLines.push(cellLines[li]);
        consumedLineIndexes.add(li);
      }
    }
    const subjectName = nameLines.join(' ').replace(/\s+/g, ' ').trim();

    // Horario: líneas después del ancla hasta la próxima ancla (o el final),
    // excluyendo cualquier cola que en realidad sea el nombre de la materia
    // siguiente (se corta apenas una línea no contiene ningún patrón de franja
    // horaria Y la que sigue tampoco, asumiendo que el horario es contiguo).
    const nextAnchorLineIndex = a + 1 < anchors.length ? anchors[a + 1].lineIndex : cellLines.length;
    const candidateLines: string[] = [];
    for (let li = anchor.endLineIndex + 1; li < nextAnchorLineIndex; li++) {
      candidateLines.push(cellLines[li]);
    }

    // Una franja horaria puede partirse a mitad de camino entre dos líneas (ej.
    // "... / Sab" seguido de "09:30 a 11:29 (Virtual)" en la línea siguiente), así
    // que no se puede decidir línea por línea si "es horario" — se unen todas las
    // líneas candidatas en un bloque y se ubica dónde termina el último match de
    // franja horaria dentro de ese texto; todo lo posterior a ese punto es el
    // nombre de la materia siguiente, no horario de esta fila.
    const candidateBlock = candidateLines.join(' ');
    let lastMatchEnd = 0;
    SLOT_REGEX.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = SLOT_REGEX.exec(candidateBlock)) !== null) {
      lastMatchEnd = m.index + m[0].length;
    }
    // Tolera un "Virtual" o "(Virtual)" suelto justo después del último match (el
    // marcador de modalidad puede quedar separado del rango horario por el corte
    // de línea del PDF).
    const trailingVirtual = candidateBlock
      .slice(lastMatchEnd)
      .match(/^\s*\(?Virtual\)?/i);
    if (trailingVirtual) lastMatchEnd += trailingVirtual[0].length;

    const scheduleText = candidateBlock.slice(0, lastMatchEnd).trim();
    const remainder = candidateBlock.slice(lastMatchEnd).trim();

    // Determina cuántas líneas de candidateLines quedaron consumidas por el
    // horario: se reconstruye acumulando longitudes hasta cubrir scheduleText.
    let consumedChars = 0;
    for (let ci = 0; ci < candidateLines.length; ci++) {
      if (consumedChars >= scheduleText.length) break;
      consumedChars += candidateLines[ci].length + 1; // +1 por el espacio de join
      consumedLineIndexes.add(anchor.endLineIndex + 1 + ci);
    }
    void remainder; // el resto queda disponible como nombre de la próxima materia (no consumido)
    let slots: ParsedSlot[] = [];
    let unparsedText: string | undefined;

    if (/^\(?virtual\)?$/i.test(scheduleText.trim())) {
      // Comisiones tipo "Inglés I (Virtual Asincrónica) -> Virtual" no tienen
      // franja horaria real (autogestionadas) — no es un error de parseo, se
      // guarda sin slots y sin marcar como no reconocido.
      slots = [];
      unparsedText = undefined;
    } else {
      const parsed = parseScheduleText(scheduleText);
      slots = parsed.slots;
      unparsedText = parsed.unparsedText;
    }

    commissions.push({
      raw: `${subjectName} | ${anchor.commission} (${anchor.modality}) | ${scheduleText}`,
      subjectName,
      commission: anchor.commission,
      modality: anchor.modality,
      slots,
      unparsedScheduleText: unparsedText,
    });
  }

  const unrecognizedLines = cellLines.filter((_, idx) => !consumedLineIndexes.has(idx));

  return { commissions, unrecognizedLines };
}
