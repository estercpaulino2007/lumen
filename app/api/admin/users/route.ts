import { z } from 'zod';
import { api, body, json, reqMeta, HttpError } from '@/lib/http';
import { requireRole, actor, publicUser, hashPassword } from '@/lib/auth';
import { newId } from '@/lib/crypto';
import crypto from 'crypto';
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

// Alta de usuario: contraseña temporal generada por el servidor, mostrada una sola vez.
export const PUT = api(async (req) => {
  const s = requireRole(req, ['admin']);
  const b = await body(req, z.object({ name: z.string().min(3).max(80), email: z.string().email().max(120), role: z.enum(['lab', 'captura', 'clinico', 'admin']), labId: z.string().max(40).optional() }));
  const temp = 'Lumen-' + crypto.randomBytes(5).toString('base64url') + '!';
  const u = mutate((db) => {
    if (db.users.some((x) => x.email.toLowerCase() === b.email.toLowerCase())) throw new HttpError(409, 'Ya existe un usuario con ese correo.');
    if (b.role === 'lab' && !db.labs.some((l) => l.id === b.labId)) throw new HttpError(400, 'Elige el laboratorio.');
    const lab = db.labs.find((l) => l.id === b.labId);
    const u = { id: newId('usr_'), email: b.email.toLowerCase(), name: b.name, role: b.role, labId: b.role === 'lab' ? b.labId : undefined, org: b.role === 'lab' ? lab?.name : 'EIRA (ficticia)', passwordHash: hashPassword(temp), active: true, createdAt: nowISO(), mustChangePassword: true };
    db.users.push(u); return u;
  });
  audit({ ...actor(s), action: 'usuario.creado', entityType: 'User', entityId: u.id, after: { role: u.role, email: u.email }, ...reqMeta(req) });
  return json({ user: publicUser(u), tempPassword: temp });
});
