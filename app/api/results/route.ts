import { api, json } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { readDB } from '@/lib/store';
import { resultView, stageOf } from '@/lib/views';

export const GET = api(async (req) => {
  const s = requireRole(req, ['lab', 'captura', 'clinico', 'admin']);
  const stage = req.nextUrl.searchParams.get('stage');
  const db = readDB();
  let rows = db.results;
  if (s.role === 'lab') rows = rows.filter((r) => r.labId === s.user.labId);
  if (s.role === 'clinico' && !stage) rows = rows.filter((r) => stageOf(r) !== 'review');
  if (stage) rows = rows.filter((r) => stageOf(r) === stage);
  rows = [...rows].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  return json({ results: rows.map((r) => ({ ...resultView(db, r, s.role), stage: stageOf(r) })) });
});
