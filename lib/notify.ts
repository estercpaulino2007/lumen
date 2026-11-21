import { DB, nowISO } from './store';
import { dlpCheck, TEMPLATES } from './dlp';
import { newId } from './crypto';
import { audit } from './audit';

// Orquestador multicanal con conmutación automática (failover).
// Resuelve el problema central: si un canal se bloquea (p. ej., WhatsApp), la entrega NO se detiene.
// Todos los canales son SIMULADOS en el prototipo; la interfaz es la de un proveedor real (SMS/email/WhatsApp Business API).
export type Channel = 'sms' | 'email' | 'whatsapp' | 'assisted';
export const CHANNEL_LABEL: Record<Channel, string> = { sms: 'SMS', email: 'Correo', whatsapp: 'WhatsApp Business (plantilla neutra)', assisted: 'Atención asistida EIRA' };

export const maskPhone = (p?: string) => { const d = String(p || '').replace(/\D/g, ''); return d ? `+52 ** *** ${d.slice(-4)}` : '—'; };
export const maskEmail = (e?: string) => { if (!e) return '—'; const [u, dom] = e.split('@'); return u.slice(0, 2) + '***@' + dom; };

function routeFor(p: any, preferred?: Channel[]): Channel[] {
  const c = p.consentFlags || {};
  const order: Channel[] = preferred || p.channelOrder || ['sms', 'email', 'whatsapp'];
  const ok = order.filter((ch) => (ch === 'sms' && p.phone && c.sms !== false) || (ch === 'email' && p.email && c.email !== false) || (ch === 'whatsapp' && p.phone && c.whatsapp));
  return [...ok, 'assisted'];
}

export function sendToPatient(db: DB, p: any, kind: 'aviso' | 'otp' | 'recordatorio', opts: { resultId?: string; code?: string; preferred?: Channel[]; at?: Date; actor?: { actorRole: string; actorId: string } } = {}) {
  const at = opts.at || new Date();
  const msg = kind === 'otp' ? TEMPLATES.otp(opts.code!, db.settings.otpTtlMinutes) : TEMPLATES[kind];
  const a = opts.actor || { actorRole: 'sistema', actorId: 'lumen' };
  // La guardia DLP solo revisa avisos (el OTP es un código, no información clínica).
  const g = kind === 'otp' ? { ok: true, hits: [] } : dlpCheck(msg);
  const n: any = { id: newId('ntf_'), kind, patientId: p.id, resultId: opts.resultId || null, message: msg, attempts: [], status: 'pendiente', simulated: true, createdAt: at.toISOString() };
  if (!g.ok) {
    n.status = 'bloqueado_dlp'; n.dlpHits = g.hits; db.notifications.push(n);
    audit({ ...a, action: 'notificacion.bloqueada_dlp', entityType: 'Notification', entityId: n.id, after: { hits: g.hits } }, at);
    return n;
  }
  for (const ch of routeFor(p, opts.preferred)) {
    if (ch === 'assisted') {
      n.attempts.push({ channel: ch, ok: true, at: at.toISOString(), note: 'Sin canal digital disponible: se crea tarea de entrega asistida' });
      n.channel = ch; n.to = 'Equipo EIRA'; n.status = 'asistida';
      if (kind !== 'otp' && opts.resultId && !db.followUps.some((f) => f.resultId === opts.resultId && f.reason === 'entrega_asistida' && f.status !== 'closed'))
        db.followUps.push({ id: newId('fu_'), patientId: p.id, resultId: opts.resultId, reason: 'entrega_asistida', priority: 'alta', dueAt: new Date(at.getTime() + 72 * 3600_000).toISOString(), status: 'open', assignedTo: null, contactAttempts: 0, lastContactAt: null, notes: 'Paciente sin canal digital disponible o canales caídos. Coordinar entrega presencial o código asistido.', createdAt: at.toISOString(), updatedAt: at.toISOString() });
      break;
    }
    if (!db.settings.channels[ch]) { n.attempts.push({ channel: ch, ok: false, at: at.toISOString(), note: 'Canal no disponible (falla simulada) → conmutando al siguiente' }); continue; }
    n.attempts.push({ channel: ch, ok: true, at: at.toISOString(), note: 'Entregado (simulado)' });
    n.channel = ch; n.to = ch === 'email' ? maskEmail(p.email) : maskPhone(p.phone); n.status = 'entregado';
    break;
  }
  db.notifications.push(n);
  audit({ ...a, action: kind === 'otp' ? 'otp.enviado' : 'notificacion.enviada', entityType: 'Notification', entityId: n.id, after: { channel: n.channel, status: n.status, resultId: n.resultId, failover: n.attempts.filter((x: any) => !x.ok).map((x: any) => x.channel) } }, at);
  return n;
}
