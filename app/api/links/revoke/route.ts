import { z } from 'zod';
import { api, body, json, reqMeta } from '@/lib/http';
import { requireRole, actor } from '@/lib/auth';
import { mutate, nowISO } from '@/lib/store';
import { audit } from '@/lib/audit';

export const POST = api(async (req) => {
  const s = requireRole(req, ['admin']);
  const b = await body(req, z.object({ jti: z.string().max(40).optional(), sessionId: z.string().max(40).optional(), patientId: z.string().max(40).optional(), reason: z.string().min(3).max(300) }));
  const n = mutate((db) => {
    let n = 0;
    for (const l of db.links) if (!l.revokedAt && (l.jti === b.jti || (b.patientId && l.patientId === b.patientId))) { l.revokedAt = nowISO(); n++; }
    for (const x of db.sessions) if (!x.revokedAt && (x.id === b.sessionId || (b.patientId && x.patientId === b.patientId))) { x.revokedAt = nowISO(); n++; }
    return n;
  });
  audit({ ...actor(s), action: 'acceso.revocado', entityType: b.jti ? 'Link' : b.sessionId ? 'Session' : 'Patient', entityId: b.jti || b.sessionId || b.patientId || '?', after: { revoked: n }, reason: b.reason, ...reqMeta(req) });
  return json({ revoked: n });
});
