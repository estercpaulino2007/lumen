import { z } from 'zod';
import { api, body, json, reqMeta, HttpError } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { mutate } from '@/lib/store';
import { sign, newId } from '@/lib/crypto';
import { audit } from '@/lib/audit';

// Enlace firmado de corta duración, ligado a la sesión de la paciente: si se reenvía, no sirve.
export const POST = api(async (req) => {
  const s = requireRole(req, ['paciente']);
  const b = await body(req, z.object({ resultId: z.string().max(40), mode: z.enum(['view', 'download']) }));
  const link = mutate((db) => {
    const r = db.results.find((x) => x.id === b.resultId);
    if (!r || r.patientId !== s.patient.id || r.clinicalStatus !== 'authorized') throw new HttpError(404, 'Documento no disponible.');
    const l = { jti: newId('lnk_'), resultId: r.id, patientId: s.patient.id, sessionId: s.session.id, mode: b.mode, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + db.settings.linkTtlMinutes * 60_000).toISOString(), maxUses: db.settings.linkMaxUses, uses: 0, revokedAt: null };
    db.links.push(l); return l;
  });
  audit({ actorRole: 'paciente', actorId: s.patient.id, action: 'enlace.firmado_creado', entityType: 'LabResult', entityId: b.resultId, after: { jti: link.jti, expiresAt: link.expiresAt, maxUses: link.maxUses }, ...reqMeta(req) });
  const token = sign({ jti: link.jti, exp: new Date(link.expiresAt).getTime() });
  return json({ url: `/api/files/${token}${b.mode === 'download' ? '?dl=1' : ''}`, expiresAt: link.expiresAt, maxUses: link.maxUses });
});
