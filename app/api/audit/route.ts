import { api, json } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { readAudit } from '@/lib/audit';
import { readDB } from '@/lib/store';

export const GET = api(async (req) => {
  requireRole(req, ['admin', 'captura', 'clinico']);
  const q = req.nextUrl.searchParams;
  const db = readDB();
  const names: Record<string, string> = {};
  for (const u of db.users) names[u.id] = u.name;
  for (const p of db.patients) names[p.id] = p.internalCode;
  let rows = readAudit();
  const f = (k: string) => q.get(k) || '';
  if (f('role')) rows = rows.filter((e) => e.actorRole === f('role'));
  if (f('action')) rows = rows.filter((e) => e.action.includes(f('action')));
  if (f('entity')) rows = rows.filter((e) => e.entityId === f('entity') || e.actorId === f('entity') || e.after?.resultId === f('entity'));
  if (f('patient')) { const rids = new Set(db.results.filter((r) => r.patientId === f('patient')).map((r) => r.id)); rows = rows.filter((e) => e.actorId === f('patient') || e.entityId === f('patient') || rids.has(e.entityId)); }
  if (f('from')) rows = rows.filter((e) => e.createdAt >= f('from'));
  if (f('to')) rows = rows.filter((e) => e.createdAt <= f('to') + 'T23:59:59');
  rows = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.seq - a.seq);
  return json({ total: rows.length, events: rows.slice(0, 400).map((e) => ({ ...e, actorName: names[e.actorId] || e.actorId })) });
});
