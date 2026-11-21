import { z } from 'zod';
import { api, body, json, reqMeta } from '@/lib/http';
import { requireRole, actor } from '@/lib/auth';
import { mutate, nowISO } from '@/lib/store';
import { audit } from '@/lib/audit';

// SIMULACIÓN rotulada: otra brigada (otro dispositivo) edita el mismo campo mientras este está sin conexión.
export const POST = api(async (req) => {
  const s = requireRole(req, ['captura', 'admin']);
  const b = await body(req, z.object({ patientId: z.string().max(40), field: z.enum(['phone', 'municipality']), value: z.string().max(80) }));
  mutate((db) => { const p = db.patients.find((x) => x.id === b.patientId); if (p) { p[b.field] = b.value; p.fieldUpdatedAt = { ...(p.fieldUpdatedAt || {}), [b.field]: nowISO() }; p.version++; } });
  audit({ ...actor(s), action: 'sync.edicion_remota_simulada', entityType: 'Patient', entityId: b.patientId, after: { field: b.field, device: 'Brigada B (simulada)' }, ...reqMeta(req) });
  return json({ ok: true });
});
