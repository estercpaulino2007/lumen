import { z } from 'zod';
import { api, body, json, reqMeta } from '@/lib/http';
import { requireRole, actor } from '@/lib/auth';
import { dlpCheck } from '@/lib/dlp';
import { audit } from '@/lib/audit';

export const POST = api(async (req) => {
  const s = requireRole(req, ['captura', 'admin', 'clinico']);
  const { text } = await body(req, z.object({ text: z.string().max(600) }));
  const r = dlpCheck(text);
  if (!r.ok) audit({ ...actor(s), action: 'notificacion.bloqueada_dlp', entityType: 'Notification', entityId: 'prueba', after: { hits: r.hits }, ...reqMeta(req) });
  return json(r);
});
