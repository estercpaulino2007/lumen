import fs from 'fs';
import path from 'path';
import { resetDB, mutate, readDB, defaultSettings } from './store';
import { resetAudit, audit } from './audit';
import { clearStorage } from './storage';
import { hashPassword } from './auth';
import { syntheticCurp } from './curp';
import { syntheticLabPdf, corruptPdf } from './pdfgen';
import { ingestPdf, processResult, associate, clinicalDecision, followUpSweep } from './flow';
import { newId } from './crypto';

// Datos de DEMOSTRACIÓN. Todas las personas, laboratorios, teléfonos, correos y CURP son FICTICIOS.
export const DEMO_PASSWORD = 'Lumen-2026!';
const ago = (d: number, h = 0) => new Date(Date.now() - d * 86400_000 - h * 3600_000);
const LABS = [
  { id: 'lab_salud_mujer', name: 'Lab Salud Mujer (ficticio)' },
  { id: 'lab_citonorte', name: 'Laboratorio Citológico del Norte (ficticio)' },
  { id: 'lab_rosa', name: 'Diagnóstica Integral Rosa (ficticio)' },
];
type P = { n: string; p: string; m: string; dob: string; phone?: string; email?: string; mun: string; access?: string; wa?: boolean; visits: [string, string][] };
const PEOPLE: P[] = [
  { n: 'María', p: 'López', m: 'Hernández', dob: '1985-03-14', phone: '5551231234', email: 'maria.lopez@ejemplo.test', mun: 'Nezahualcóyotl', wa: true, visits: [['EIRA-M-0101', '2026-05-10'], ['EIRA-M-0457', '2026-11-12']] },
  { n: 'María Guadalupe', p: 'López', m: 'Hernández', dob: '1979-07-02', phone: '5559879871', mun: 'Nezahualcóyotl', visits: [['EIRA-M-0458', '2026-11-12']] },
  { n: 'Ana Karen', p: 'Ruiz', m: 'Sánchez', dob: '1992-10-21', email: 'anakaren.ruiz@ejemplo.test', mun: 'Chimalhuacán', access: 'sin_telefono', visits: [['EIRA-M-0460', '2026-11-12']] },
  { n: 'Josefina', p: 'Martínez', m: 'Cruz', dob: '1958-01-30', mun: 'Chalco', access: 'sin_internet', visits: [['EIRA-M-0461', '2026-11-12']] },
  { n: 'Rosa Elena', p: 'Domínguez', m: 'Vega', dob: '1975-06-09', phone: '5554448812', mun: 'Ecatepec de Morelos', wa: true, visits: [['EIRA-M-0462', '2026-11-13']] },
  { n: 'Patricia', p: 'Morales', m: 'Flores', dob: '1988-12-02', phone: '5553337720', mun: 'Ecatepec de Morelos', wa: true, visits: [['EIRA-M-0463', '2026-11-13']] },
  { n: 'Luz María', p: 'Torres', m: 'Jiménez', dob: '1969-04-17', phone: '5552226641', email: 'luzmaria.t@ejemplo.test', mun: 'Texcoco', visits: [['EIRA-M-0464', '2026-11-13']] },
  { n: 'Verónica', p: 'Castillo', m: 'Reyes', dob: '1981-09-25', phone: '5556662093', mun: 'Texcoco', wa: true, visits: [['EIRA-M-0465', '2026-11-14']] },
  { n: 'Alejandra', p: 'Gómez', m: 'Navarro', dob: '1995-02-11', phone: '5557775530', mun: 'Chimalhuacán', visits: [['EIRA-M-0466', '2026-11-14']] },
  { n: 'Carmen', p: 'Salas', m: 'Ortega', dob: '1972-08-05', phone: '5558884417', mun: 'Chalco', visits: [['EIRA-M-0467', '2026-11-14']] },
];

export function buildPatient(x: P, i: number, at: Date) {
  const fullName = `${x.n} ${x.p} ${x.m}`;
  return {
    id: 'pac_' + String(i + 1).padStart(3, '0'), internalCode: 'EIRA-' + (7000 + i * 37).toString(36).toUpperCase(), fictitious: true,
    fullName, dateOfBirth: x.dob, curp: syntheticCurp(x.n, x.p, x.m, x.dob, 'MC'), phone: x.phone ? '+52' + x.phone : null, email: x.email || null, municipality: x.mun,
    digitalAccess: x.access || 'completo',
    consentFlags: { sms: !!x.phone, email: !!x.email, whatsapp: !!x.wa, camera: true, research_anon: true, signedAt: at.toISOString(), version: 'v1-demo' },
    channelOrder: x.wa ? ['whatsapp', 'sms', 'email'] : ['sms', 'email', 'whatsapp'], identityVerificationLevel: 'basic', faceReferenceHash: null, faceReferenceVector: null,
    visits: x.visits.map(([f, d], k) => ({ id: `vis_${i}_${k}`, jornada: d.startsWith('2026-05') ? 'Jornada Neza · mayo 2026' : 'Jornada Oriente Edomex · nov 2026', sampleFolio: f, collectedAt: d, services: ['Papanicolaou'] })),
    createdAt: at.toISOString(), createdBy: 'usr_captura', status: 'active', version: 1, updatedAt: at.toISOString(), fieldUpdatedAt: {},
  };
}

const pdfFor = (i: number, lab: string, over: any = {}) => {
  const x = PEOPLE[i]; const v = x.visits[x.visits.length - 1];
  return syntheticLabPdf({ labName: lab, nombre: `${x.n} ${x.p} ${x.m}`, fechaNac: x.dob, curp: syntheticCurp(x.n, x.p, x.m, x.dob, 'MC'), municipio: x.mun, folioMuestra: v[0], folioLaudo: 'LAU-' + (24100 + i), fechaToma: v[1], fechaResultado: '2026-11-18', ...over });
};

/** PDFs sintéticos para la demo en vivo (se suben desde la pantalla del laboratorio). */
export async function writeSamples() {
  const dir = path.join(process.cwd(), 'public', 'samples');
  fs.mkdirSync(dir, { recursive: true });
  const L = LABS[0].name;
  const files: [string, Buffer][] = [
    ['01-maria-lopez-segunda-visita.pdf', await syntheticLabPdf({ labName: L, nombre: 'Maria Lopez Hernandez', fechaNac: '1985-03-14', telefono: '55 1098 1234', municipio: 'Nezahualcoyotl', folioMuestra: 'EIRA-M-0457', fechaToma: '2026-11-12', fechaResultado: '2026-11-20' })],
    ['02-homonimas-ma-guadalupe.pdf', await syntheticLabPdf({ labName: L, nombre: 'Ma. Guadalupe Lopez Hernandez', municipio: 'Nezahualcóyotl', fechaToma: '2026-11-12', folioLaudo: 'LAU-30002', fechaResultado: '2026-11-20' })],
    ['03-escaneo-sin-texto.pdf', await syntheticLabPdf({ labName: L, nombre: '', noText: true })],
    ['04-curp-inconsistente.pdf', await syntheticLabPdf({ labName: L, nombre: 'Carmen Salas Ortega', fechaNac: '1972-05-08', curp: syntheticCurp('Carmen', 'Salas', 'Ortega', '1972-08-05', 'MC'), municipio: 'Chalco', folioMuestra: 'EIRA-M-0467', fechaToma: '2026-11-14', folioLaudo: 'LAU-30004', fechaResultado: '2026-11-20' })],
    ['05-pagina-ausente.pdf', await syntheticLabPdf({ labName: L, nombre: 'Verónica Castillo Reyes', fechaNac: '1981-09-25', municipio: 'Texcoco', folioMuestra: 'EIRA-M-0465', fechaToma: '2026-11-14', folioLaudo: 'LAU-30005', fechaResultado: '2026-11-20', declaredPages: 2 })],
    ['06-pdf-corrupto.pdf', corruptPdf()],
  ];
  for (const [n, b] of files) fs.writeFileSync(path.join(dir, n), b);
  return files.map(([n]) => n);
}

export async function seedDemo() {
  resetAudit(); clearStorage(); resetDB();
  const t0 = ago(9);
  mutate((db) => {
    db.seededAt = new Date().toISOString(); db.settings = defaultSettings(); db.labs = LABS;
    const pw = hashPassword(DEMO_PASSWORD);
    db.users = [
      { id: 'usr_lab', email: 'lab@lumen.demo', name: 'Recepción · Lab Salud Mujer', role: 'lab', labId: LABS[0].id, org: LABS[0].name },
      { id: 'usr_lab2', email: 'lab2@lumen.demo', name: 'Recepción · Citológico del Norte', role: 'lab', labId: LABS[1].id, org: LABS[1].name },
      { id: 'usr_captura', email: 'captura@lumen.demo', name: 'Daniela Ortiz', role: 'captura', org: 'EIRA · Coordinación (ficticia)' },
      { id: 'usr_clinica', email: 'clinica@lumen.demo', name: 'Dra. Laura Méndez', role: 'clinico', org: 'EIRA · Equipo médico (ficticia)' },
      { id: 'usr_admin', email: 'admin@lumen.demo', name: 'Sofía Ramírez', role: 'admin', org: 'EIRA · Administración (ficticia)' },
    ].map((u) => ({ ...u, passwordHash: pw, active: true, createdAt: t0.toISOString() }));
    db.patients = PEOPLE.map((x, i) => buildPatient(x, i, t0));
  });
  audit({ actorRole: 'sistema', actorId: 'seed', action: 'demo.datos_cargados', entityType: 'System', entityId: 'seed', after: { patients: 10, labs: 3, fictitious: true } }, t0);

  const lab = (i: number) => ({ actorRole: 'lab', actorId: i === 1 ? 'usr_lab2' : 'usr_lab' });
  const cap = { actorRole: 'captura', actorId: 'usr_captura' }, cli = { actorRole: 'clinico', actorId: 'usr_clinica' };
  const step = async (pi: number | null, labIdx: number, d: number, stage: string, over: any = {}, buf?: Buffer) => {
    const L = LABS[labIdx];
    const b = buf || (await pdfFor(pi!, L.name, over));
    const r = await ingestPdf({ buf: b, fileName: `laudo_${pi ?? 'x'}_${d}.pdf`, labId: L.id, actor: lab(labIdx), at: ago(d, 6) });
    await processResult(r.id, ago(d, 5.9));
    if (stage === 'review') return r.id;
    associate(r.id, 'confirm', { patientId: 'pac_' + String(pi! + 1).padStart(3, '0'), actor: cap, at: ago(d, 4) });
    if (stage === 'clinical') return r.id;
    clinicalDecision(r.id, 'authorize', { reason: 'Documento revisado y paciente confirmada.', followUp: over.__fu, actor: cli, at: ago(d, 2) });
    return r.id;
  };
  const access = (id: string, d: number, dl: boolean) => mutate((db) => {
    const r = db.results.find((x) => x.id === id)!;
    r.accessCount = 1; r.downloadCount = dl ? 1 : 0; r.deliveryStatus = dl ? 'downloaded' : 'accessed'; r.timeline.accessed = ago(d).toISOString();
    db.accessLogs.push({ id: newId('al_'), resultId: id, patientId: r.patientId, action: dl ? 'download' : 'view', method: 'otp', success: true, createdAt: ago(d).toISOString(), metadata: { seeded: true } });
    audit({ actorRole: 'paciente', actorId: r.patientId, action: dl ? 'documento.descargado' : 'documento.visualizado', entityType: 'LabResult', entityId: id, after: { method: 'otp' } }, ago(d));
  });

  const r1 = await step(0, 0, 7, 'done', { fechaToma: '2026-05-10', folioMuestra: 'EIRA-M-0101', folioLaudo: 'LAU-23001' }); access(r1, 6.5, true);
  const r2 = await step(4, 1, 6, 'done', { __fu: true }); access(r2, 5.2, false);
  await step(5, 0, 4, 'done');                       // notificada hace >48 h y SIN acceso → seguimiento automático
  const r4 = await step(6, 2, 4, 'done'); access(r4, 3.4, true);
  const r12 = await step(2, 1, 3, 'done'); access(r12, 2.5, false); // sin teléfono → aviso por correo
  await step(3, 2, 2, 'done');                       // sin internet → entrega asistida
  await step(7, 0, 1, 'clinical');
  await step(8, 1, 1, 'clinical');
  await step(9, 2, 0.4, 'review');
  await step(null, 0, 0.3, 'review', {}, await syntheticLabPdf({ labName: LABS[0].name, nombre: 'Ma. Guadalupe Lopez Hernandez', municipio: 'Nezahualcóyotl', folioLaudo: 'LAU-29999', fechaResultado: '2026-11-19' }));
  const bad = await step(null, 1, 0.25, 'review', {}, corruptPdf());
  associate(bad, 'correction', { note: 'El PDF llegó dañado. Favor de reenviar el documento completo.', actor: cap, at: ago(0.2) });
  await step(null, 2, 0.2, 'review', {}, await pdfFor(1, LABS[2].name, { fechaToma: undefined, folioMuestra: undefined, folioLaudo: 'LAU-30010' }));

  mutate((db) => {
    followUpSweep(db);
    const fu = db.followUps.find((f) => f.reason === 'contacto_indicado_por_profesional');
    if (fu) { fu.contactAttempts = 1; fu.lastContactAt = ago(4).toISOString(); fu.notes += ' · Intento 1: no contestó (simulado).'; }
  });
  const samples = await writeSamples();
  return { ok: true, patients: 10, labs: 3, results: readDB().results.length, samples, password: DEMO_PASSWORD };
}

/** En modo demo, si el almacén está vacío (p. ej., Render reinició con disco efímero), carga la demo automáticamente una vez. */
export async function ensureDemo() {
  if (process.env.LUMEN_DEMO_MODE === 'false') return;
  if (readDB().seededAt) return;
  const g = globalThis as any;
  if (!g.__lumenSeeding) g.__lumenSeeding = seedDemo().catch((e) => { console.error('[seed]', e); }).finally(() => { g.__lumenSeeding = null; });
  await g.__lumenSeeding;
}
