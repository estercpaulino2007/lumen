import { api, json, reqMeta } from '@/lib/http';
import { getSession, revokeSession, COOKIE } from '@/lib/auth';
import { audit } from '@/lib/audit';

export const POST = api(async (req) => {
  const s = getSession(req);
  if (s) { revokeSession(s.session.id); audit({ actorRole: s.role, actorId: s.user?.id || s.patient?.id, action: 'sesion.cerrada', entityType: 'Session', entityId: s.session.id, ...reqMeta(req) }); }
  const res = json({ ok: true });
  res.cookies.set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
});
