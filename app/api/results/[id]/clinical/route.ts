import { z } from 'zod';
import { api, body, json, reqMeta, HttpError } from '@/lib/http';
import { requireRole, actor, checkPassword } from '@/lib/auth';
import { clinicalDecision } from '@/lib/flow';
import { readDB } from '@/lib/store';
import { audit } from '@/lib/audit';

export const POST = api(async (req, ctx) => {
  const s = requireRole(req, ['clinico']);
  const { id } = await ctx.params;
  const b = await body(req, z.object({ decision: z.enum(['authorize', 'return', 'block']), reason: z.string().min(5, 'mínimo 5 caracteres').max(500), followUp: z.boolean().optional(), password: z.string().max(200).optional() }));
  // Reautenticación en evento sensible: autorizar una entrega exige confirmar la contraseña.
  if (readDB().settings.requireReauthForClinical && b.decision === 'authorize') {
    if (!b.password || !checkPassword(b.password, s.user.passwordHash)) {
      audit({ ...actor(s), action: 'reautenticacion.fallida', entityType: 'LabResult', entityId: id, ...reqMeta(req) });
      throw new HttpError(401, 'Confirma tu contraseña para autorizar la entrega.');
    }
  }
  return json({ result: clinicalDecision(id, b.decision, { reason: b.reason, followUp: b.followUp, actor: { ...actor(s), ...reqMeta(req) } }) });
});
