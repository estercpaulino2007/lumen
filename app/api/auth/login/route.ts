import { z } from 'zod';
import { api, body, json, reqMeta, HttpError } from '@/lib/http';
import { readDB } from '@/lib/store';
import { checkPassword, createSession, COOKIE, cookieOptions, publicUser } from '@/lib/auth';
import { rateLimited } from '@/lib/kv';
import { audit } from '@/lib/audit';

export const POST = api(async (req) => {
  const { email, password } = await body(req, z.object({ email: z.string().email().max(120), password: z.string().min(1).max(200) }));
  const m = reqMeta(req);
  if (await rateLimited('login:ip:' + m.ipAddressHash, 20, 600) || await rateLimited('login:acct:' + email.toLowerCase(), 8, 600))
    throw new HttpError(429, 'Demasiados intentos. Espera unos minutos.');
  const u = readDB().users.find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (!u || !u.active || !checkPassword(password, u.passwordHash)) {
    audit({ actorRole: 'anonimo', actorId: email.toLowerCase().slice(0, 3) + '***', action: 'login.fallido', entityType: 'User', entityId: u?.id || 'desconocido', ...m });
    throw new HttpError(401, 'Correo o contraseña incorrectos.');
  }
  const s = createSession(req, { userId: u.id, role: u.role, method: 'password' });
  const res = json({ user: publicUser(u) });
  res.cookies.set(COOKIE, s.token, cookieOptions(s.maxAge));
  return res;
});
