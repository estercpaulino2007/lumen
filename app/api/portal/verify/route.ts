import { z } from 'zod';
import { api, body, json, reqMeta, HttpError } from '@/lib/http';
import { readDB, mutate, nowISO } from '@/lib/store';
import { kv, rateLimited } from '@/lib/kv';
import { otpHash, safeEqual } from '@/lib/crypto';
import { findByContact, accessLog } from '@/lib/portal';
import { createSession, COOKIE, cookieOptions } from '@/lib/auth';
import { audit } from '@/lib/audit';

export const POST = api(async (req) => {
  const b = await body(req, z.object({ contact: z.string().min(5).max(120), code: z.string().regex(/^\d{6}$/, 'debe tener 6 dígitos') }));
  const m = reqMeta(req);
  if (await rateLimited('verify:ip:' + m.ipAddressHash, 30, 900)) throw new HttpError(429, 'Demasiados intentos desde este dispositivo.');
  const db = readDB();
  const p = findByContact(db, b.contact);
  if (!p) throw new HttpError(401, 'Código incorrecto o vencido.');
  if (await kv.get('lock:pat:' + p.id)) throw new HttpError(423, 'Acceso bloqueado temporalmente (15 min) por intentos fallidos.');
  const acc = [...db.secureAccess].reverse().find((a) => a.patientId === p.id && a.status === 'pending');
  if (!acc) throw new HttpError(401, 'Código incorrecto o vencido. Solicita uno nuevo.');
  if (new Date(acc.expiresAt).getTime() < Date.now()) { mutate((d) => { d.secureAccess.find((a) => a.id === acc.id)!.status = 'expired'; }); throw new HttpError(410, 'El código venció (5 minutos). Solicita uno nuevo.'); }
  const max = db.settings.otpMaxAttempts;
  const ok = safeEqual(otpHash(acc.salt, b.code), acc.otpHash);
  const out = mutate((d) => {
    const a = d.secureAccess.find((x) => x.id === acc.id)!;
    a.attempts++;
    if (ok) { a.usedAt = nowISO(); a.status = 'verified'; }
    else if (a.attempts >= max) a.status = 'locked';
    accessLog(d, { patientId: p.id, action: ok ? 'otp_verified' : 'otp_failed', method: 'otp', success: ok, ...m, metadata: { attempt: a.attempts } });
    return { attempts: a.attempts, status: a.status };
  });
  audit({ actorRole: 'paciente', actorId: p.id, action: ok ? 'otp.validado' : 'otp.fallido', entityType: 'SecureAccess', entityId: acc.id, after: { attempts: out.attempts }, ...m });
  if (!ok) {
    if (out.status === 'locked') { await kv.set('lock:pat:' + p.id, '1', 900); audit({ actorRole: 'sistema', actorId: 'lumen', action: 'acceso.bloqueo_temporal', entityType: 'Patient', entityId: p.id, ...m }); throw new HttpError(423, 'Demasiados intentos. Bloqueamos el acceso 15 minutos para protegerte.'); }
    throw new HttpError(401, `Código incorrecto. Te quedan ${max - out.attempts} intentos.`, { attemptsLeft: max - out.attempts });
  }
  const s = createSession(req, { patientId: p.id, role: 'paciente', method: 'otp' });
  const res = json({ ok: true, firstName: p.fullName.split(' ')[0], cameraConsent: !!p.consentFlags?.camera });
  res.cookies.set(COOKIE, s.token, cookieOptions(s.maxAge));
  return res;
});
