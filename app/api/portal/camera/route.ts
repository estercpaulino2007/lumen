import { z } from 'zod';
import { api, body, json, reqMeta } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { mutate } from '@/lib/store';
import { accessLog } from '@/lib/portal';
import { audit } from '@/lib/audit';

// Solo recibe el RESULTADO de la verificación hecha en el dispositivo. La imagen y el vector facial nunca salen del navegador.
export const POST = api(async (req) => {
  const s = requireRole(req, ['paciente']);
  const b = await body(req, z.object({ outcome: z.enum(['passed', 'failed', 'skipped', 'denied']), score: z.number().min(0).max(1).optional(), method: z.enum(['face-api-liveness', 'simulacion-rotulada', 'none']), challenge: z.string().max(40).optional() }));
  const m = reqMeta(req);
  mutate((db) => {
    const a = [...db.secureAccess].reverse().find((x) => x.patientId === s.patient.id && x.status === 'verified');
    if (a && b.outcome === 'passed') { a.cameraVerification = true; a.cameraVerificationScore = b.score ?? null; a.cameraVerificationMethod = b.method; }
    accessLog(db, { patientId: s.patient.id, action: 'camera_' + b.outcome, method: b.method, success: b.outcome === 'passed', ...m, metadata: { score: b.score, challenge: b.challenge } });
  });
  audit({ actorRole: 'paciente', actorId: s.patient.id, action: 'camara.' + b.outcome, entityType: 'Patient', entityId: s.patient.id, after: { method: b.method, score: b.score ?? null }, ...m });
  return json({ ok: true });
});
