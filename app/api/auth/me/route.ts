import { ensureDemo } from '@/lib/seed';
import { api, json } from '@/lib/http';
import { getSession, publicUser } from '@/lib/auth';
import { readDB } from '@/lib/store';
import { kv } from '@/lib/kv';
import { usingDemoKey } from '@/lib/crypto';

export const GET = api(async (req) => {
  await ensureDemo();
  const s = getSession(req);
  const db = readDB();
  return json({
    user: s?.user ? publicUser(s.user) : null,
    patient: s?.patient ? { id: s.patient.id, firstName: s.patient.fullName.split(' ')[0] } : null,
    role: s?.role || null, expiresAt: s?.session.expiresAt || null,
    system: { seeded: !!db.seededAt, demoMode: process.env.LUMEN_DEMO_MODE !== 'false', kv: kv.kind, demoKey: usingDemoKey },
  });
});
