import { api, json } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { mutate } from '@/lib/store';
import { followUpSweep } from '@/lib/flow';
import { stageOf } from '@/lib/views';
import { verifyChain, readAudit } from '@/lib/audit';
import { kv } from '@/lib/kv';
import { queueStats } from '@/lib/queue';

const h = (a?: string, b?: string) => (a && b ? (new Date(b).getTime() - new Date(a).getTime()) / 3600_000 : null);
const avg = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null); return v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 : 0; };

export const GET = api(async (req) => {
  requireRole(req, ['captura', 'clinico', 'admin']);
  const db = mutate((d) => { followUpSweep(d); return d; });
  const R = db.results, today = new Date().toISOString().slice(0, 10);
  const lim = db.settings.followUpHours * 3600_000;
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 86400_000).toISOString().slice(0, 10));
  const metrics = {
    receivedToday: R.filter((r) => r.receivedAt.slice(0, 10) === today).length,
    awaitingReview: R.filter((r) => stageOf(r) === 'review').length,
    awaitingAuth: R.filter((r) => stageOf(r) === 'clinical').length,
    authorized: R.filter((r) => r.clinicalStatus === 'authorized').length,
    notified: R.filter((r) => ['notified', 'accessed', 'downloaded'].includes(r.deliveryStatus)).length,
    accessed: R.filter((r) => ['accessed', 'downloaded'].includes(r.deliveryStatus)).length,
    notAccessed48h: R.filter((r) => r.deliveryStatus === 'notified' && r.timeline?.notified && Date.now() - new Date(r.timeline.notified).getTime() > lim).length,
    deliveryFailures: R.filter((r) => r.deliveryStatus === 'failed').length,
    noDigital: db.patients.filter((p) => p.digitalAccess !== 'completo').length,
    openFollowUps: db.followUps.filter((f) => f.status === 'open').length,
    ocrFailures: R.filter((r) => ['failed', 'needs_ocr'].includes(r.ocrStatus)).length,
    whatsappDependency: 0,
  };
  const charts = {
    perDay: days.map((d) => ({ day: d.slice(5).split('-').reverse().join('/'), recibidos: R.filter((r) => r.receivedAt.slice(0, 10) === d).length, autorizados: R.filter((r) => r.timeline?.authorized?.slice(0, 10) === d).length, consultados: R.filter((r) => r.timeline?.accessed?.slice(0, 10) === d).length })),
    times: [
      { etapa: 'Recepción → revisión', horas: avg(R.map((r) => h(r.timeline?.received, r.timeline?.reviewed))) },
      { etapa: 'Revisión → autorización', horas: avg(R.map((r) => h(r.timeline?.reviewed, r.timeline?.authorized))) },
      { etapa: 'Recepción → autorización', horas: avg(R.map((r) => h(r.timeline?.received, r.timeline?.authorized))) },
      { etapa: 'Autorización → acceso', horas: avg(R.map((r) => h(r.timeline?.authorized, r.timeline?.accessed))) },
    ],
    byLab: db.labs.map((l) => ({ lab: l.name.replace(' (ficticio)', ''), pendientes: R.filter((r) => r.labId === l.id && stageOf(r) !== 'delivery').length, entregados: R.filter((r) => r.labId === l.id && stageOf(r) === 'delivery').length, fallosOCR: R.filter((r) => r.labId === l.id && ['failed', 'needs_ocr'].includes(r.ocrStatus)).length })),
    followUps: ['no_acceso_48h', 'entrega_asistida', 'contacto_indicado_por_profesional'].map((k) => ({ motivo: { no_acceso_48h: 'Sin acceso', entrega_asistida: 'Asistida', contacto_indicado_por_profesional: 'Indicado' }[k], abiertos: db.followUps.filter((f) => f.reason === k && f.status === 'open').length })),
    channels: ['sms', 'email', 'whatsapp', 'assisted'].map((c) => ({ canal: { sms: 'SMS', email: 'Correo', whatsapp: 'WhatsApp', assisted: 'Asistida' }[c], avisos: db.notifications.filter((n) => n.kind !== 'otp' && n.channel === c).length })),
  };
  const LABEL: Record<string, [string, string]> = {
    'resultado.cargado': ['Nuevo resultado cargado', 'Procesando'], 'asociacion.sugerida': ['Asociación sugerida', 'En revisión'],
    'asociacion.confirmada': ['Asociación confirmada', 'Revisado'], 'autorizacion.clinica': ['Autorización clínica completada', 'Autorizado'],
    'notificacion.enviada': ['Aviso enviado a la paciente', 'Enviado'], 'documento.descargado': ['Documento descargado por la paciente', 'Entregado'],
    'documento.visualizado': ['Documento consultado por la paciente', 'Consultado'], 'seguimiento.creado': ['Seguimiento creado', 'Seguimiento'],
    'correccion.solicitada': ['Corrección solicitada al laboratorio', 'Corrección'], 'notificacion.bloqueada_dlp': ['Mensaje bloqueado por la guardia clínica', 'Bloqueado'],
  };
  const names: Record<string, string> = {}; db.users.forEach((u) => (names[u.id] = u.name)); db.labs.forEach((l) => (names[l.id] = l.name));
  const who = (e: any) => { const r = db.results.find((x) => x.id === e.entityId || x.id === e.after?.resultId); const p = r && db.patients.find((x) => x.id === r.patientId); return p?.fullName || (e.after?.patientId && db.patients.find((x) => x.id === e.after.patientId)?.fullName) || names[e.actorId] || r?.labName || ''; };
  const activity = readAudit().filter((e) => LABEL[e.action]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)
    .map((e) => ({ action: e.action, title: LABEL[e.action][0], tag: LABEL[e.action][1], who: who(e), score: e.after?.score ?? null, at: e.createdAt, href: e.entityType === 'LabResult' ? `/resultados/${e.entityId}` : null }));
  const spark = (k: 'recibidos' | 'autorizados' | 'consultados') => charts.perDay.map((d: any) => d[k]);
  const chain = verifyChain();
  return json({ metrics, charts, activity, spark: { recibidos: spark('recibidos'), autorizados: spark('autorizados'), consultados: spark('consultados') }, system: { kv: kv.kind, queue: queueStats(), auditOk: chain.ok, auditCount: chain.count, channels: db.settings.channels } });
});
