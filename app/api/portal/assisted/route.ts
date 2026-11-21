import { z } from 'zod';
import { api, body, json, reqMeta, HttpError } from '@/lib/http';
import { readDB, mutate, nowISO } from '@/lib/store';
import { otpHash, safeEqual } from '@/lib/crypto';
import { rateLimited } from '@/lib/kv';
import { createSession, COOKIE, cookieOptions } from '@/lib/auth';
import { accessLog } from '@/lib/portal';
import { audit } from '@/lib/audit';

export const POST = api(async (req) => {
  const b = await body(req, z.object({ code: z.string().min(8).max(12), dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }));
  const m = reqMeta(req);
  if (await rateLimited('assist:ip:' + m.ipAddressHash, 10, 900)) throw new HttpError(429, 'Demasiados intentos.');
  const code = b.code.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^(.{4})/, '$1-');
  const db = readDB();
  const rec = db.assistedCodes.find((a) => !a.usedAt && new Date(a.expiresAt).getTime() > Date.now() && safeEqual(otpHash(a.salt, code), a.codeHash));
  const p = rec && db.patients.find((x) => x.id === rec.patientId);
  if (!rec || !p || p.dateOfBirth !== b.dateOfBirth) {
    mutate((d) => accessLog(d, { patientId: p?.id || null, action: 'assisted_failed', method: 'assisted', success: false, ...m }));
    throw new HttpError(401, 'Código o fecha de nacimiento incorrectos.');
  }
  mutate((d) => { d.assistedCodes.find((a) => a.id === rec.id)!.usedAt = nowISO(); accessLog(d, { patientId: p.id, action: 'assisted_verified', method: 'assisted', success: true, ...m }); });
  audit({ actorRole: 'paciente', actorId: p.id, action: 'acceso_asistido.validado', entityType: 'Patient', entityId: p.id, after: { issuedBy: rec.issuedBy }, ...m });
  const s = createSession(req, { patientId: p.id, role: 'paciente', method: 'assisted' });
  const res = json({ ok: true, firstName: p.fullName.split(' ')[0], cameraConsent: false });
  res.cookies.set(COOKIE, s.token, cookieOptions(s.maxAge));
  return res;
});
