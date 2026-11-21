import { api, json } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { readDB } from '@/lib/store';

// Vista completa de la paciente, SIN contenido clínico: exámenes y su etapa, avisos recibidos,
// quién accedió a sus documentos (transparencia) y preferencias de contacto.
const STAGE = (r: any) => r.clinicalStatus === 'authorized' ? 4 : r.reviewStatus === 'approved' ? 3 : r.ocrStatus === 'done' || r.ocrStatus === 'failed' || r.ocrStatus === 'needs_ocr' ? 2 : 1;
export const GET = api(async (req) => {
  const s = requireRole(req, ['paciente']);
  const db = readDB(); const p = db.patients.find((x) => x.id === s.patient.id)!;
  const mine = db.results.filter((r) => r.patientId === p.id && r.associationStatus !== 'rejected' && r.clinicalStatus !== 'blocked');
  const exams = [
    ...mine.map((r) => ({ id: r.id, type: 'Papanicolaou', collectedAt: r.collectedAt, lab: r.labName, stage: STAGE(r), available: r.clinicalStatus === 'authorized', opened: r.accessCount + r.downloadCount > 0, updatedAt: r.updatedAt })),
    ...(p.visits || []).filter((v: any) => !mine.some((r) => r.collectedAt === v.collectedAt)).map((v: any) => ({ id: v.id, type: 'Papanicolaou', collectedAt: v.collectedAt, lab: null, stage: 0, available: false, opened: false, updatedAt: v.collectedAt })),
  ].sort((a, b) => String(b.collectedAt).localeCompare(String(a.collectedAt)));
  const notices = db.notifications.filter((n) => n.patientId === p.id && n.kind !== 'otp').reverse().slice(0, 10).map((n) => ({ id: n.id, at: n.createdAt, channel: n.channel, status: n.status, message: n.message, kind: n.kind }));
  const ids = new Set(mine.map((r) => r.id));
  const users = Object.fromEntries(db.users.map((u) => [u.id, u]));
  const access = db.accessLogs.filter((l) => l.resultId && ids.has(l.resultId) && l.success && ['view', 'download', 'staff_view'].includes(l.action)).reverse().slice(0, 15)
    .map((l) => ({ at: l.createdAt, action: l.action, who: l.action === 'staff_view' ? ({ captura: 'Personal administrativo de EIRA', clinico: 'Profesional de salud de EIRA', admin: 'Administración de EIRA', lab: 'Laboratorio' } as any)[users[l.metadata?.userId]?.role || l.method] || 'Personal autorizado' : 'Tú' }));
  const c = p.consentFlags || {};
  return json({ firstName: p.fullName.split(' ')[0], exams, notices, access, prefs: { sms: !!c.sms, email: !!c.email, whatsapp: !!c.whatsapp, hasPhone: !!p.phone, hasEmail: !!p.email, order: p.channelOrder }, openRequest: db.followUps.some((f) => f.patientId === p.id && f.reason === 'paciente_solicita_orientacion' && f.status === 'open') });
});
