import { z } from 'zod';
import { api, body, json, reqMeta, HttpError } from '@/lib/http';
import { requireRole, actor, publicUser } from '@/lib/auth';
import { readDB, mutate, nowISO } from '@/lib/store';
import { audit } from '@/lib/audit';

export const GET = api(async (req) => { requireRole(req, ['admin']); const db = readDB(); return json({ users: db.users.map((u) => ({ ...publicUser(u), sessions: db.sessions.filter((s) => s.userId === u.id && !s.revokedAt && new Date(s.expiresAt).getTime() > Date.now()).length })) }); });
export const POST = api(async (req) => {
  const s = requireRole(req, ['admin']);
  const b = await body(req, z.object({ userId: z.string().max(40), active: z.boolean(), reason: z.string().min(3).max(200) }));
  if (b.userId === s.user.id) throw new HttpError(400, 'No puedes desactivar tu propia cuenta.');
  mutate((db) => { const u = db.users.find((x) => x.id === b.userId); if (!u) throw new HttpError(404, 'Usuario no encontrado.'); u.active = b.active; if (!b.active) db.sessions.filter((x) => x.userId === u.id).forEach((x) => (x.revokedAt = x.revokedAt || nowISO())); });
  audit({ ...actor(s), action: b.active ? 'usuario.activado' : 'usuario.desactivado', entityType: 'User', entityId: b.userId, reason: b.reason, ...reqMeta(req) });
  return json({ ok: true });
});
