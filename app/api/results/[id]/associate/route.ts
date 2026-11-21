import { z } from 'zod';
import { api, body, json, reqMeta } from '@/lib/http';
import { requireRole, actor } from '@/lib/auth';
import { associate } from '@/lib/flow';

export const POST = api(async (req, ctx) => {
  const s = requireRole(req, ['captura', 'admin']);
  const { id } = await ctx.params;
  const b = await body(req, z.object({ action: z.enum(['confirm', 'manual', 'reject', 'correction']), patientId: z.string().max(40).optional(), note: z.string().max(500).optional() }));
  return json({ result: associate(id, b.action, { patientId: b.patientId, note: b.note, actor: { ...actor(s), ...reqMeta(req) } }) });
});
