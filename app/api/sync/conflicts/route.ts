import { api, json } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { readDB } from '@/lib/store';
export const GET = api(async (req) => { requireRole(req, ['captura', 'admin']); const db = readDB(); return json({ conflicts: db.syncQueue.filter((q) => q.status === 'conflict'), recent: [...db.syncQueue].reverse().slice(0, 15) }); });
