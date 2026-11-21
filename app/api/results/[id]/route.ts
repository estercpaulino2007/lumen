import { api, json, HttpError } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { readDB } from '@/lib/store';
import { readAudit } from '@/lib/audit';
import { resultView, stageOf } from '@/lib/views';

export const GET = api(async (req, ctx) => {
  const s = requireRole(req, ['lab', 'captura', 'clinico', 'admin']);
  const { id } = await ctx.params;
  const db = readDB();
  const r = db.results.find((x) => x.id === id);
  if (!r || (s.role === 'lab' && r.labId !== s.user.labId)) throw new HttpError(404, 'No encontrado.');
  const candidates = s.role === 'lab' ? [] : (r.candidates || []).map((c: any) => ({ ...c, patient: (() => { const p = db.patients.find((x) => x.id === c.patientId); return p && { municipality: p.municipality, dateOfBirth: p.dateOfBirth, digitalAccess: p.digitalAccess, visits: p.visits }; })() }));
  const history = readAudit().filter((e) => e.entityId === id || e.after?.resultId === id).map((e) => ({ seq: e.seq, createdAt: e.createdAt, action: e.action, actorRole: e.actorRole, actorId: e.actorId, reason: e.reason }));
  return json({ result: { ...resultView(db, r, s.role), stage: stageOf(r), candidates }, authorizations: db.authorizations.filter((a) => a.resultId === id), history: s.role === 'lab' ? [] : history, notifications: s.role === 'lab' ? [] : db.notifications.filter((n) => n.resultId === id) });
});
