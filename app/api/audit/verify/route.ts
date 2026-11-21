import { api, json } from '@/lib/http';
import { requireRole } from '@/lib/auth';
import { verifyChain } from '@/lib/audit';
export const GET = api(async (req) => { requireRole(req, ['admin', 'captura', 'clinico']); return json(verifyChain()); });
