import { DB } from './store';
export const normContact = (c: string) => (c.includes('@') ? c.trim().toLowerCase() : c.replace(/\D/g, '').slice(-10));
export function findByContact(db: DB, contact: string) {
  const c = normContact(contact);
  if (!c) return null;
  return db.patients.find((p) => p.status === 'active' && (c.includes('@') ? (p.email || '').toLowerCase() === c : (p.phone || '').replace(/\D/g, '').slice(-10) === c)) || null;
}
export function accessLog(db: DB, e: { resultId?: string | null; patientId?: string | null; action: string; method: string; success: boolean; ipAddressHash?: string | null; userAgentHash?: string | null; metadata?: any }) {
  db.accessLogs.push({ id: 'al_' + Math.random().toString(36).slice(2, 12), createdAt: new Date().toISOString(), deviceFingerprintHash: null, ...e });
}
