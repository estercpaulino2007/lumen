import { z } from 'zod';
import { api, body, json, reqMeta, HttpError } from '@/lib/http';
import { requireRole, actor } from '@/lib/auth';
import { mutate, nowISO } from '@/lib/store';
import { audit } from '@/lib/audit';

export const POST = api(async (req, ctx) => {
  const s = requireRole(req, ['captura', 'clinico', 'admin']);
  const { id } = await ctx.params;
  const b = await body(req, z.object({ outcome: z.enum(['contactada', 'no_contesto', 'numero_equivocado', 'cita_agendada', 'entrega_presencial', 'cerrar']), notes: z.string().max(400).optional() }));
  const f = mutate((db) => {
    const f = db.followUps.find((x) => x.id === id);
    if (!f) throw new HttpError(404, 'No encontrado.');
    f.contactAttempts++; f.lastContactAt = nowISO(); f.updatedAt = nowISO(); f.assignedTo = s.user.id;
    f.notes = (f.notes || '') + ` · ${new Date().toLocaleDateString('es-MX')}: ${b.outcome.replace('_', ' ')}${b.notes ? ' — ' + b.notes : ''}`;
    if (['cita_agendada', 'entrega_presencial', 'cerrar', 'contactada'].includes(b.outcome)) f.status = 'closed';
    return f;
  });
  audit({ ...actor(s), action: 'seguimiento.contacto_registrado', entityType: 'FollowUpTask', entityId: id, after: { outcome: b.outcome, status: f.status }, ...reqMeta(req) });
  return json({ followUp: f });
});
