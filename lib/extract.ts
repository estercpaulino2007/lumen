// Extracción de campos IDENTIFICADORES de un PDF de laboratorio + controles de calidad.
// Principio "ciega a lo clínico": solo se leen etiquetas administrativas conocidas;
// la sección de resultado/interpretación NUNCA se lee, guarda ni interpreta.
import { validateCurp } from './curp';

/** Texto por líneas usando pdf.js (Mozilla). Reagrupa los fragmentos por coordenada vertical. */
async function pdfText(buf: Buffer) {
  // @ts-ignore — módulo ESM sin tipos para la ruta legacy
  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, disableFontFace: true, verbosity: 0 }).promise;
  const lines: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    const rows = new Map<number, string>();
    for (const it of tc.items as any[]) if ('str' in it) { const y = Math.round(it.transform[5]); rows.set(y, (rows.get(y) || '') + it.str); }
    [...rows.entries()].sort((a, b) => b[0] - a[0]).forEach(([, t]) => lines.push(t));
  }
  return { text: lines.join('\n'), numpages: doc.numPages };
}

const LABELS: Record<string, RegExp> = {
  nombre: /^(nombre de la paciente|nombre|paciente)$/,
  fechaNac: /^(fecha de nacimiento|f\. ?nacimiento)$/,
  curp: /^curp$/,
  telefono: /^(telefono|tel)$/,
  municipio: /^(municipio|localidad)$/,
  folioMuestra: /^(folio de muestra|no\.? de muestra)$/,
  folioLaudo: /^(folio de laudo|numero de laudo|no\.? de laudo)$/,
  fechaToma: /^(fecha de toma|fecha de colecta|toma de muestra)$/,
  fechaResultado: /^(fecha de resultado|fecha de reporte|fecha de emision)$/,
  laboratorio: /^laboratorio$/,
  tipoEstudio: /^(tipo de estudio|estudio)$/,
};
const CLINICAL = /^(resultado|interpretacion|diagnostico|categoria|hallazgos|observaciones)/;
const EXPECTED = ['nombre', 'fechaNac', 'fechaToma', 'laboratorio', 'tipoEstudio', 'folioLaudo', 'fechaResultado'];
const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export function toISO(s?: string | null) {
  if (!s) return null;
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (m) return t;
  m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

export type Issue = { level: 'error' | 'warn' | 'info'; code: string; msg: string };

export async function extractPdf(buf: Buffer) {
  const issues: Issue[] = [];
  let text = '', pages = 0;
  try { const r = await pdfText(buf); text = r.text || ''; pages = r.numpages || 0; }
  catch (e: any) { if (process.env.LUMEN_DEBUG) console.error('[extract]', e?.message); return { ok: false, fields: {}, issues: [{ level: 'error', code: 'pdf_corrupto', msg: 'El PDF está dañado o incompleto y no se puede abrir. Solicitar nuevo envío al laboratorio.' }] as Issue[], pages: 0, confidence: 0, hasText: false }; }

  const hasText = text.replace(/\s/g, '').length > 40;
  const fields: Record<string, string> = {};
  if (!hasText) {
    issues.push({ level: 'error', code: 'texto_ilegible', msg: 'El documento no tiene texto legible (escaneo de imagen o muy baja calidad). Requiere OCR de imagen o captura asistida de identificadores.' });
    return { ok: true, fields, issues, pages, confidence: 0, hasText };
  }
  let declaredPages = 0;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const pg = plain(line).match(/pagina\s+\d+\s+de\s+(\d+)/); if (pg) declaredPages = Math.max(declaredPages, +pg[1]);
    const i = line.indexOf(':'); if (i < 1) continue;
    const label = plain(line.slice(0, i)), value = line.slice(i + 1).trim();
    if (CLINICAL.test(label)) continue; // nunca se lee contenido clínico
    for (const [k, re] of Object.entries(LABELS)) if (re.test(label) && value && !fields[k]) fields[k] = value;
  }
  for (const k of ['fechaNac', 'fechaToma', 'fechaResultado']) if (fields[k]) fields[k] = toISO(fields[k]) || fields[k];
  if (fields.curp) fields.curp = fields.curp.toUpperCase().replace(/\s/g, '');

  if (declaredPages > pages) issues.push({ level: 'error', code: 'pagina_ausente', msg: `El documento declara ${declaredPages} páginas pero contiene ${pages}. Falta al menos una página.` });
  if (!fields.fechaToma) issues.push({ level: 'warn', code: 'fecha_ausente', msg: 'No se encontró la fecha de toma de la muestra.' });
  if (!fields.fechaNac) issues.push({ level: 'warn', code: 'fecha_nac_ausente', msg: 'No se encontró la fecha de nacimiento.' });
  if (!fields.nombre) issues.push({ level: 'error', code: 'nombre_ausente', msg: 'No se encontró el nombre de la paciente.' });
  if (fields.curp) {
    const v = validateCurp(fields.curp);
    if (!v.ok) issues.push({ level: 'warn', code: 'curp_invalida', msg: `CURP no válida: ${v.reason}.` });
    else if (fields.fechaNac && v.birth !== fields.fechaNac) issues.push({ level: 'error', code: 'curp_vs_fecha', msg: `La fecha de nacimiento del documento (${fields.fechaNac}) no coincide con la codificada en la CURP (${v.birth}). Posible error de captura del laboratorio.` });
  }
  if (fields.fechaToma && fields.fechaResultado && fields.fechaResultado < fields.fechaToma) issues.push({ level: 'error', code: 'fechas_incoherentes', msg: 'La fecha de resultado es anterior a la fecha de toma.' });
  if (pages > 4) issues.push({ level: 'warn', code: 'muchas_paginas', msg: `El documento tiene ${pages} páginas: ¿podría incluir resultados de otra paciente?` });

  const found = EXPECTED.filter((k) => fields[k]).length;
  const confidence = Math.round((found / EXPECTED.length) * 100) / 100;
  return { ok: true, fields, issues, pages, confidence, hasText };
}

export function qualityLabel(issues: Issue[]) {
  if (issues.some((i) => i.level === 'error')) return 'mala';
  if (issues.some((i) => i.level === 'warn')) return 'regular';
  return 'buena';
}
