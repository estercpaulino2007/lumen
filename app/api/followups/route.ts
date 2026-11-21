import { api, json } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { mutate } from '@/lib/store';
import { followUpSweep } from '@/lib/flow';

export const GET = api(async (req) => {
  requireRole(req, ['captura', 'clinico', 'admin']);
  const out = mutate((db) => { followUpSweep(db); return db.followUps.map((f) => { const p = db.patients.find((x) => x.id === f.patientId); return { ...f, patient: p && { fullName: p.fullName, internalCode: p.internalCode, digitalAccess: p.digitalAccess, phoneMasked: p.phone ? '••' + p.phone.slice(-4) : null, municipality: p.municipality } }; }); });
  return json({ followUps: out.sort((a, b) => (a.status === b.status ? (a.priority === 'alta' ? -1 : 1) : a.status === 'open' ? -1 : 1)) });
});
