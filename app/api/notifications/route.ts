import { api, json } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { readDB } from '@/lib/store';

export const GET = api(async (req) => {
  requireRole(req, ['captura', 'admin', 'clinico']);
  const db = readDB();
  const demo = process.env.LUMEN_DEMO_MODE !== 'false';
  return json({ channels: db.settings.channels, notifications: [...db.notifications].reverse().slice(0, 80).map((n) => ({ ...n, message: n.kind === 'otp' && !demo ? 'LUMEN: tu código de seguridad es ••••••' : n.message, patientName: db.patients.find((p) => p.id === n.patientId)?.fullName })) });
});
