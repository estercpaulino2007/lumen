import { api, reqMeta, HttpError } from '@/lib/http';
import { requireRole, actor } from '@/lib/auth';
import { readDB } from '@/lib/store';
import { pseudonym } from '@/lib/crypto';
import { stageOf } from '@/lib/views';
import { audit } from '@/lib/audit';

// Exportación en formatos abiertos. "anon": seudónimos irreversibles, rango de edad, sin nombre/contacto.
// "selected": identificada, solo registros elegidos y con motivo obligatorio. Ninguna incluye contenido clínico.
const band = (dob?: string) => { if (!dob) return 'ND'; const a = Math.floor((Date.now() - new Date(dob).getTime()) / 3.15576e10); const b = Math.floor(a / 10) * 10; return `${b}-${b + 9}`; };
const hrs = (a?: string, b?: string) => (a && b ? Math.round((new Date(b).getTime() - new Date(a).getTime()) / 360_000) / 10 : '');

export const GET = api(async (req) => {
  const s = requireRole(req, ['captura', 'admin']);
  const q = req.nextUrl.searchParams;
  const format = q.get('format') === 'json' ? 'json' : 'csv';
  const mode = q.get('mode') === 'selected' ? 'selected' : 'anon';
  const ids = (q.get('ids') || '').split(',').filter(Boolean);
  const reason = q.get('reason') || '';
  if (mode === 'selected' && (!ids.length || reason.length < 5)) throw new HttpError(400, 'La exportación identificada requiere seleccionar registros y escribir un motivo.');
  const db = readDB();
  let rows = db.results.filter((r) => !q.get('lab') || r.labId === q.get('lab'));
  if (mode === 'selected') rows = rows.filter((r) => ids.includes(r.id));
  const data = rows.map((r) => {
    const p = db.patients.find((x) => x.id === r.patientId);
    const base: any = {
      registro: mode === 'anon' ? pseudonym(r.id) : r.id, paciente: p ? (mode === 'anon' ? pseudonym(p.id) : p.internalCode) : '',
      rango_edad: band(p?.dateOfBirth), municipio: p?.municipality || '', programa: 'Detección cervicouterina', estudio: 'Papanicolaou',
      laboratorio: r.labName, semana_recepcion: r.receivedAt.slice(0, 10), etapa: stageOf(r), entrega: r.deliveryStatus,
      calidad_documento: r.quality || '', asociacion: r.associationStatus, ajuste_manual: r.associationStatus === 'confirmed_manual' ? 'sí' : 'no',
      horas_recepcion_autorizacion: hrs(r.timeline?.received, r.timeline?.authorized), horas_autorizacion_acceso: hrs(r.timeline?.authorized, r.timeline?.accessed),
      canal_sin_digital: p && p.digitalAccess !== 'completo' ? 'sí' : 'no', fuente: 'LUMEN prototipo — DATOS FICTICIOS',
    };
    if (mode === 'selected' && p) Object.assign(base, { nombre: p.fullName });
    return base;
  });
  const meta = { generadoEn: new Date().toISOString(), generadoPor: s.user.name, modo: mode, registros: data.length, fechaCorte: new Date().toISOString().slice(0, 10), nota: 'No contiene diagnósticos ni contenido clínico. Datos ficticios.', motivo: reason || null };
  audit({ ...actor(s), action: 'exportacion.' + mode, entityType: 'Export', entityId: format, after: { registros: data.length, ids: mode === 'selected' ? ids : undefined }, reason: reason || null, ...reqMeta(req) });
  if (format === 'json') return new Response(JSON.stringify({ meta, data }, null, 2), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="lumen-${mode}.json"`, 'Cache-Control': 'no-store' } });
  const cols = Object.keys(data[0] || { registro: '' });
  const esc = (v: any) => { const t = String(v ?? ''); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const csv = [`# ${JSON.stringify(meta)}`, cols.join(','), ...data.map((d) => cols.map((c) => esc(d[c])).join(','))].join('\n');
  return new Response('﻿' + csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="lumen-${mode}.csv"`, 'Cache-Control': 'no-store' } });
});
