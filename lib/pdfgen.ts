import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

// Generador de PDFs SINTÉTICOS de laboratorio (datos ficticios, sin contenido clínico real)
// y marca de agua dinámica para cada acceso.
const dmy = (iso?: string) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };

export async function syntheticLabPdf(o: {
  labName: string; nombre: string; fechaNac?: string; curp?: string; telefono?: string; municipio?: string;
  folioMuestra?: string; folioLaudo?: string; fechaToma?: string; fechaResultado?: string; declaredPages?: number; noText?: boolean;
}) {
  const doc = await PDFDocument.create();
  doc.setTitle('Documento sintético LUMEN'); doc.setProducer('LUMEN demo'); doc.setSubject('DATOS FICTICIOS');
  const page = doc.addPage([595, 842]);
  const f = await doc.embedFont(StandardFonts.Helvetica), b = await doc.embedFont(StandardFonts.HelveticaBold);
  if (o.noText) {
    // Simula un escaneo: solo formas, sin capa de texto.
    page.drawRectangle({ x: 40, y: 40, width: 515, height: 762, color: rgb(0.93, 0.92, 0.9) });
    for (let i = 0; i < 28; i++) page.drawRectangle({ x: 60, y: 760 - i * 24, width: 200 + ((i * 37) % 260), height: 6, color: rgb(0.55, 0.55, 0.55) });
    return Buffer.from(await doc.save({ useObjectStreams: false }));
  }
  let y = 790;
  const line = (t: string, font = f, size = 11, color = rgb(0.1, 0.1, 0.12)) => { page.drawText(t, { x: 50, y, size, font, color }); y -= size + 9; };
  page.drawRectangle({ x: 0, y: 812, width: 595, height: 30, color: rgb(0.96, 0.62, 0.11) });
  page.drawText('DOCUMENTO SINTÉTICO — DATOS FICTICIOS — SIN VALOR CLÍNICO', { x: 50, y: 822, size: 11, font: b, color: rgb(0.1, 0.1, 0.1) });
  y = 785;
  line(o.labName.toUpperCase(), b, 16);
  line('Reporte de citología cervical', f, 11, rgb(0.35, 0.35, 0.4));
  y -= 8;
  line(`Laboratorio: ${o.labName}`);
  line('Tipo de estudio: Papanicolaou (citología cervical)');
  line(`Nombre de la paciente: ${o.nombre}`);
  if (o.fechaNac) line(`Fecha de nacimiento: ${dmy(o.fechaNac)}`);
  if (o.curp) line(`CURP: ${o.curp}`);
  if (o.telefono) line(`Teléfono: ${o.telefono}`);
  if (o.municipio) line(`Municipio: ${o.municipio}`);
  if (o.folioMuestra) line(`Folio de muestra: ${o.folioMuestra}`);
  if (o.folioLaudo) line(`Folio de laudo: ${o.folioLaudo}`);
  if (o.fechaToma) line(`Fecha de toma: ${dmy(o.fechaToma)}`);
  if (o.fechaResultado) line(`Fecha de resultado: ${dmy(o.fechaResultado)}`);
  y -= 14;
  line('RESULTADO', b, 12);
  line('[Sección clínica omitida: este prototipo no genera ni interpreta contenido clínico.]', f, 10, rgb(0.4, 0.4, 0.45));
  line('[En un piloto real, aquí iría el reporte del laboratorio, que LUMEN entrega sin leerlo.]', f, 10, rgb(0.4, 0.4, 0.45));
  y -= 20;
  line('Responsable: Q.F.B. Persona Ficticia — Cédula de ejemplo 0000000', f, 9, rgb(0.4, 0.4, 0.45));
  page.drawText(`Página 1 de ${o.declaredPages || 1}`, { x: 480, y: 30, size: 9, font: f, color: rgb(0.4, 0.4, 0.45) });
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

export function corruptPdf() {
  return Buffer.concat([Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'), Buffer.from('xref\n0 3\ntrailer <<\n')]);
}

export async function watermark(buf: Buffer, lines: string[]) {
  const doc = await PDFDocument.load(buf, { updateMetadata: false });
  const f = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const p of doc.getPages()) {
    const { width, height } = p.getSize();
    for (let i = 0; i < 3; i++) p.drawText(lines[0], { x: 60, y: height * (0.2 + i * 0.3), size: 26, font: f, color: rgb(0.22, 0.55, 0.85), opacity: 0.13, rotate: degrees(30) });
    p.drawRectangle({ x: 0, y: 0, width, height: 22, color: rgb(0.04, 0.04, 0.06), opacity: 0.85 });
    p.drawText(lines.join('  ·  '), { x: 12, y: 7, size: 8, font: f, color: rgb(0.9, 0.95, 1) });
  }
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}
