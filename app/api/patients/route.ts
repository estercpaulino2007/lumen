import { z } from 'zod';
import { api, body, json, reqMeta } from '@/lib/http';
import { requireRole, actor } from '@/lib/auth';
import { readDB, mutate, nowISO } from '@/lib/store';
import { audit } from '@/lib/audit';
import { nameSim, norm } from '@/lib/match';
import { validateCurp } from '@/lib/curp';
import { newId } from '@/lib/crypto';

export const GET = api(async (req) => {
  requireRole(req, ['captura', 'clinico', 'admin']);
  const q = req.nextUrl.searchParams.get('q') || '';
  const db = readDB();
  let rows = db.patients;
  if (q) rows = rows.map((p) => ({ p, s: Math.max(nameSim(q, p.fullName), norm(p.internalCode) === norm(q) ? 1 : 0, (p.curp || '').startsWith(q.toUpperCase()) ? 1 : 0) })).filter((x) => x.s > 0.75).sort((a, b) => b.s - a.s).map((x) => x.p);
  return json({ patients: rows.map((p) => ({ id: p.id, internalCode: p.internalCode, fullName: p.fullName, dateOfBirth: p.dateOfBirth, municipality: p.municipality, digitalAccess: p.digitalAccess, phoneMasked: p.phone ? '••' + p.phone.slice(-4) : null, hasEmail: !!p.email, consentFlags: p.consentFlags, results: db.results.filter((r) => r.patientId === p.id).length, version: p.version, fictitious: p.fictitious })) });
});

export const POST = api(async (req) => {
  const s = requireRole(req, ['captura', 'admin']);
  const b = await body(req, z.object({ fullName: z.string().min(5).max(120), dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), phone: z.string().max(20).optional().nullable(), email: z.string().email().optional().nullable().or(z.literal('')), municipality: z.string().max(80), curp: z.string().max(18).optional().nullable(), digitalAccess: z.enum(['completo', 'sin_telefono', 'sin_internet']).default('completo'), consent: z.object({ sms: z.boolean(), email: z.boolean(), whatsapp: z.boolean(), camera: z.boolean(), research_anon: z.boolean() }) }));
  if (b.curp) { const v = validateCurp(b.curp); if (!v.ok) return json({ error: 'CURP inválida: ' + v.reason }, 400); if (v.birth !== b.dateOfBirth) return json({ error: `La CURP indica nacimiento ${v.birth}.` }, 400); }
  const p = mutate((db) => {
    const p = { id: newId('pac_'), internalCode: 'EIRA-' + Math.random().toString(36).slice(2, 7).toUpperCase(), fictitious: true, fullName: b.fullName, dateOfBirth: b.dateOfBirth, curp: b.curp || null, phone: b.phone ? '+52' + b.phone.replace(/\D/g, '').slice(-10) : null, email: b.email || null, municipality: b.municipality, digitalAccess: b.digitalAccess, consentFlags: { ...b.consent, signedAt: nowISO(), version: 'v1-demo' }, channelOrder: b.consent.whatsapp ? ['whatsapp', 'sms', 'email'] : ['sms', 'email', 'whatsapp'], identityVerificationLevel: 'basic', visits: [], createdAt: nowISO(), createdBy: s.user.id, status: 'active', version: 1, updatedAt: nowISO(), fieldUpdatedAt: {} };
    db.patients.push(p); return p;
  });
  audit({ ...actor(s), action: 'paciente.registrada', entityType: 'Patient', entityId: p.id, after: { internalCode: p.internalCode, consent: p.consentFlags }, ...reqMeta(req) });
  return json({ patient: { id: p.id, internalCode: p.internalCode } });
});
