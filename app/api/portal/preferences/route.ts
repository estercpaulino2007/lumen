import { z } from 'zod';
import { api, body, json, reqMeta } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { mutate, nowISO } from '@/lib/store';
import { audit } from '@/lib/audit';

export const POST = api(async (req) => {
  const s = requireRole(req, ['paciente']);
  const b = await body(req, z.object({ sms: z.boolean(), email: z.boolean(), whatsapp: z.boolean(), preferred: z.enum(['sms', 'email', 'whatsapp']) }));
  const out = mutate((db) => {
    const p = db.patients.find((x) => x.id === s.patient.id)!;
    const before = { ...p.consentFlags, order: p.channelOrder };
    p.consentFlags = { ...p.consentFlags, sms: b.sms && !!p.phone, email: b.email && !!p.email, whatsapp: b.whatsapp && !!p.phone, updatedAt: nowISO() };
    p.channelOrder = [b.preferred, ...(['sms', 'email', 'whatsapp'] as const).filter((x) => x !== b.preferred)];
    return { before, after: { ...p.consentFlags, order: p.channelOrder } };
  });
  audit({ actorRole: 'paciente', actorId: s.patient.id, action: 'paciente.preferencias_actualizadas', entityType: 'Patient', entityId: s.patient.id, before: out.before, after: out.after, ...reqMeta(req) });
  return json({ ok: true });
});
