import { z } from 'zod';
import { api, body, json, reqMeta } from '@/lib/http';
import { requireRole, actor } from '@/lib/auth';
import { readDB, mutate } from '@/lib/store';
import { audit } from '@/lib/audit';

export const GET = api(async (req) => { requireRole(req, ['captura', 'admin', 'clinico']); return json({ settings: readDB().settings }); });
export const POST = api(async (req) => {
  const s = requireRole(req, ['admin', 'captura']);
  const b = await body(req, z.object({
    channels: z.object({ sms: z.boolean(), email: z.boolean(), whatsapp: z.boolean(), assisted: z.boolean() }).partial().optional(),
    linkTtlMinutes: z.number().int().min(1).max(30).optional(), linkMaxUses: z.number().int().min(1).max(10).optional(),
    retentionDays: z.number().int().min(30).max(3650).optional(), followUpHours: z.number().int().min(1).max(240).optional(),
  }));
  if (s.role === 'captura' && Object.keys(b).some((k) => k !== 'channels')) return json({ error: 'Solo administración cambia políticas de privacidad.' }, 403);
  const out = mutate((db) => { const before = JSON.parse(JSON.stringify(db.settings)); db.settings = { ...db.settings, ...b, channels: { ...db.settings.channels, ...(b.channels || {}) } }; return { before, after: db.settings }; });
  audit({ ...actor(s), action: 'configuracion.cambiada', entityType: 'Settings', entityId: 'global', before: out.before, after: out.after, ...reqMeta(req) });
  return json({ settings: out.after });
});
