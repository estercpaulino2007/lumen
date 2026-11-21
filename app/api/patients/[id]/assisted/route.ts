import { api, json, reqMeta, HttpError } from '@/lib/http';
import { requireRole, actor } from '@/lib/auth';
import { mutate, nowISO } from '@/lib/store';
import { audit } from '@/lib/audit';
import { assistedCode, otpHash, newId } from '@/lib/crypto';

// Código de acceso asistido: para pacientes sin celular, correo o internet.
// Se imprime en un ticket y solo funciona en presencia de personal autorizado (24 h, un solo uso).
export const POST = api(async (req, ctx) => {
  const s = requireRole(req, ['captura', 'admin']);
  const { id } = await ctx.params;
  const code = assistedCode();
  const rec = mutate((db) => {
    const p = db.patients.find((x) => x.id === id);
    if (!p) throw new HttpError(404, 'Paciente no encontrada.');
    const salt = newId();
    const rec = { id: newId('ac_'), patientId: id, salt, codeHash: otpHash(salt, code), issuedBy: s.user.id, createdAt: nowISO(), expiresAt: new Date(Date.now() + 24 * 3600_000).toISOString(), usedAt: null, attempts: 0 };
    db.assistedCodes.push(rec); return { rec, name: p.fullName, internalCode: p.internalCode };
  });
  audit({ ...actor(s), action: 'codigo_asistido.generado', entityType: 'Patient', entityId: id, ...reqMeta(req) });
  return json({ code, expiresAt: rec.rec.expiresAt, patient: { fullName: rec.name, internalCode: rec.internalCode } });
});
