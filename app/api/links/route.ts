import { api, json } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { readDB } from '@/lib/store';

export const GET = api(async (req) => {
  requireRole(req, ['admin']);
  const db = readDB();
  return json({ links: [...db.links].reverse().slice(0, 50).map((l) => ({ ...l, active: !l.revokedAt && l.uses < l.maxUses && new Date(l.expiresAt).getTime() > Date.now(), patientCode: db.patients.find((p) => p.id === l.patientId)?.internalCode })), sessions: db.sessions.filter((s) => !s.revokedAt && new Date(s.expiresAt).getTime() > Date.now()).map((s) => ({ id: s.id, role: s.role, method: s.method, createdAt: s.createdAt, who: s.userId ? db.users.find((u) => u.id === s.userId)?.name : db.patients.find((p) => p.id === s.patientId)?.internalCode })) });
});
