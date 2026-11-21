import { z } from 'zod';
import { api, body, json, reqMeta, HttpError } from '@/lib/http';
import { mutate } from '@/lib/store';
import { rateLimited, kv } from '@/lib/kv';
import { otpCode, otpHash, newId } from '@/lib/crypto';
import { sendToPatient } from '@/lib/notify';
import { findByContact, normContact, accessLog } from '@/lib/portal';
import { audit } from '@/lib/audit';

export const POST = api(async (req) => {
  const { contact } = await body(req, z.object({ contact: z.string().min(5).max(120) }));
  const m = reqMeta(req);
  if (await rateLimited('otp:ip:' + m.ipAddressHash, 15, 900) || await rateLimited('otp:c:' + normContact(contact), 4, 900)) throw new HttpError(429, 'Demasiadas solicitudes. Intenta en 15 minutos o pide ayuda a EIRA.');
  const generic = { ok: true, message: 'Si tus datos están registrados, recibirás un código de 6 dígitos en unos segundos.' };
  const code = otpCode();
  const sent = await (async () => {
    let lockedFor = null as string | null;
    const r = mutate((db) => {
      const p = findByContact(db, contact);
      if (!p) { accessLog(db, { action: 'otp_request', method: 'otp', success: false, ...m, metadata: { reason: 'contacto_no_registrado' } }); return null; }
      return p;
    });
    if (!r) return null;
    lockedFor = await kv.get('lock:pat:' + r.id);
    if (lockedFor) return 'locked';
    return mutate((db) => {
      const p = db.patients.find((x) => x.id === r.id)!;
      db.secureAccess.filter((a) => a.patientId === p.id && a.status === 'pending').forEach((a) => (a.status = 'superseded'));
      const salt = newId();
      const acc = { id: newId('sa_'), resultId: null, patientId: p.id, salt, otpHash: otpHash(salt, code), expiresAt: new Date(Date.now() + db.settings.otpTtlMinutes * 60_000).toISOString(), usedAt: null, attempts: 0, cameraVerification: false, cameraVerificationScore: null, cameraVerificationMethod: null, status: 'pending', createdAt: new Date().toISOString() };
      db.secureAccess.push(acc);
      const n = sendToPatient(db, p, 'otp', { code, preferred: contact.includes('@') ? ['email'] : ['sms', 'whatsapp'] });
      accessLog(db, { patientId: p.id, action: 'otp_generated', method: n.channel, success: true, ...m });
      return acc.id;
    });
  })();
  if (sent === 'locked') throw new HttpError(423, 'Acceso bloqueado temporalmente por intentos fallidos. Intenta en 15 minutos o solicita atención asistida.');
  const demoMode = process.env.LUMEN_DEMO_MODE !== 'false';
  if (sent) audit({ actorRole: 'paciente', actorId: 'pendiente', action: 'otp.generado', entityType: 'SecureAccess', entityId: sent, ...m });
  return json({ ...generic, demo: demoMode ? (sent ? 'Modo demo: el SMS es simulado, por eso te mostramos el código aquí. En producción solo llega a tu celular.' : 'Modo demo: ese contacto no está en los datos de demostración. Usa 55 5123 1234 o anakaren.ruiz@ejemplo.test (o vuelve a cargar la demo).') : null, demoCode: demoMode && sent ? code : null });
});
