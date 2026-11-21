import { z } from 'zod';
import { api, body, json, reqMeta, HttpError } from '@/lib/http';
import { requireRole, actor } from '@/lib/auth';
import { mutate, nowISO } from '@/lib/store';
import { audit } from '@/lib/audit';

export const POST = api(async (req) => {
  const s = requireRole(req, ['captura', 'admin']);
  const b = await body(req, z.object({ id: z.string().max(40), choices: z.record(z.string(), z.enum(['server', 'client'])) }));
  const out = mutate((db) => {
    const q = db.syncQueue.find((x) => x.id === b.id && x.status === 'conflict');
    if (!q) throw new HttpError(404, 'Conflicto no encontrado.');
    const p = db.patients.find((x) => x.id === q.entityId)!;
    const applied: any = {};
    for (const c of q.conflictData.conflicts) { const ch = b.choices[c.field] || 'server'; if (ch === 'client') { p[c.field] = c.clientValue; p.fieldUpdatedAt[c.field] = nowISO(); } applied[c.field] = ch === 'client' ? c.clientValue : c.serverValue; }
    p.version++; q.status = 'resolved'; q.resolution = { choices: b.choices, by: s.user.id, at: nowISO() };
    return { q, applied };
  });
  audit({ ...actor(s), action: 'sync.conflicto_resuelto', entityType: 'OfflineSyncQueue', entityId: b.id, after: { choices: b.choices }, ...reqMeta(req) });
  return json(out);
});
