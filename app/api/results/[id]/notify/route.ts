import { api, json, reqMeta, HttpError } from '@/lib/http';
import { requireRole, actor } from '@/lib/auth';
import { notifyResult } from '@/lib/flow';
import { readDB } from '@/lib/store';

export const POST = api(async (req, ctx) => {
  const s = requireRole(req, ['captura', 'admin']);
  const { id } = await ctx.params;
  const r = readDB().results.find((x) => x.id === id);
  if (!r || r.clinicalStatus !== 'authorized') throw new HttpError(409, 'Solo se notifican resultados autorizados.');
  return json({ notification: notifyResult(id, { actor: { ...actor(s), ...reqMeta(req) }, kind: 'recordatorio' }) });
});
