import { api, json } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { readDB } from '@/lib/store';

export const GET = api(async (req) => {
  const s = requireRole(req, ['paciente']);
  const db = readDB();
  const docs = db.results.filter((r) => r.patientId === s.patient.id && r.clinicalStatus === 'authorized').map((r) => ({ id: r.id, examType: 'Papanicolaou', collectedAt: r.collectedAt, labName: r.labName, availableSince: r.timeline?.authorized, opened: r.accessCount > 0 }));
  const sec = [...db.secureAccess].reverse().find((x) => x.patientId === s.patient.id && x.status === 'verified');
  return json({ firstName: s.patient.fullName.split(' ')[0], internalCodeTail: s.patient.internalCode.split('-').pop(), method: s.session.method, cameraVerified: !!sec?.cameraVerification, documents: docs, expiresAt: s.session.expiresAt });
});
