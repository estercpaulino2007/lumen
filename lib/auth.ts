import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { readDB, mutate, nowISO } from './store';
import { randomToken, sha256, newId } from './crypto';
import { HttpError, reqMeta } from './http';
import { audit } from './audit';

export const COOKIE = 'lumen_session';
export type Role = 'lab' | 'captura' | 'clinico' | 'admin' | 'paciente';
export const ROLE_LABEL: Record<Role, string> = { lab: 'Laboratorio', captura: 'EIRA · Captura/Administrativo', clinico: 'EIRA · Profesional de salud', admin: 'Administración', paciente: 'Paciente' };
const STAFF_TTL = 8 * 3600_000, PATIENT_TTL = 15 * 60_000, IDLE = 60 * 60_000;

export const hashPassword = (p: string) => bcrypt.hashSync(p, 10);
export const checkPassword = (p: string, h: string) => bcrypt.compareSync(p, h);

export function cookieOptions(maxAgeSec: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production' && process.env.LUMEN_INSECURE_COOKIES !== '1', sameSite: 'lax' as const, path: '/', maxAge: maxAgeSec };
}

/** Crea sesión con token aleatorio único; en la base solo se guarda su hash. */
export function createSession(req: NextRequest, subject: { userId?: string; patientId?: string; role: Role; method: string }) {
  const token = randomToken();
  const ttl = subject.role === 'paciente' ? PATIENT_TTL : STAFF_TTL;
  const m = reqMeta(req);
  const s = { id: newId('ses_'), tokenHash: sha256(token), ...subject, createdAt: nowISO(), lastSeenAt: nowISO(), expiresAt: new Date(Date.now() + ttl).toISOString(), revokedAt: null, ipAddressHash: m.ipAddressHash, userAgentHash: m.userAgentHash };
  mutate((db) => { db.sessions.push(s); db.sessions = db.sessions.filter((x) => new Date(x.expiresAt).getTime() > Date.now() - 86400_000); });
  audit({ actorRole: subject.role, actorId: subject.userId || subject.patientId!, action: 'sesion.iniciada', entityType: 'Session', entityId: s.id, after: { method: subject.method }, ...m });
  return { token, maxAge: Math.floor(ttl / 1000), session: s };
}

export function getSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const db = readDB();
  const s = db.sessions.find((x) => x.tokenHash === sha256(token));
  if (!s || s.revokedAt || new Date(s.expiresAt).getTime() < Date.now()) return null;
  if (s.role !== 'paciente' && Date.now() - new Date(s.lastSeenAt).getTime() > IDLE) return null;
  const user = s.userId ? db.users.find((u) => u.id === s.userId) : null;
  if (s.userId && (!user || !user.active)) return null;
  const patient = s.patientId ? db.patients.find((p) => p.id === s.patientId) : null;
  if (Date.now() - new Date(s.lastSeenAt).getTime() > 60_000) mutate((d) => { const x = d.sessions.find((y) => y.id === s.id); if (x) x.lastSeenAt = nowISO(); });
  return { session: s, user, patient, role: s.role as Role };
}

export function requireRole(req: NextRequest, roles: Role[]) {
  const s = getSession(req);
  if (!s) throw new HttpError(401, 'Sesión no válida o expirada.');
  if (!roles.includes(s.role)) {
    audit({ actorRole: s.role, actorId: s.user?.id || s.patient?.id, action: 'acceso.denegado', entityType: 'Route', entityId: req.nextUrl.pathname, ...reqMeta(req) });
    throw new HttpError(403, 'Tu rol no tiene permiso para esta acción.');
  }
  return s;
}
export const actor = (s: ReturnType<typeof requireRole>) => ({ actorRole: s.role, actorId: s.user?.id || s.patient?.id });

export function revokeSession(id: string) { mutate((db) => { const s = db.sessions.find((x) => x.id === id); if (s) s.revokedAt = nowISO(); }); }
export const publicUser = (u: any) => u && ({ id: u.id, name: u.name, email: u.email, role: u.role, labId: u.labId || null, org: u.org, active: u.active });
