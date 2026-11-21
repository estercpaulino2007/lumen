import fs from 'fs';
import path from 'path';

// Almacén del prototipo: un archivo JSON con escritura atómica (tmp + rename).
// El modelo replica 1:1 el schema Prisma de docs/schema.prisma para migrar a SQLite/PostgreSQL.
// Las operaciones son síncronas dentro de un solo proceso Node: no hay intercalado entre lecturas y escrituras.
export const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'lumen.json');

export type DB = {
  version: number; seededAt?: string;
  users: any[]; sessions: any[]; labs: any[]; patients: any[]; results: any[];
  reviewTasks: any[]; authorizations: any[]; secureAccess: any[]; accessLogs: any[];
  notifications: any[]; followUps: any[]; syncQueue: any[]; links: any[]; assistedCodes: any[];
  settings: any;
};
export const defaultSettings = () => ({
  channels: { sms: true, email: true, whatsapp: false, assisted: true },
  linkTtlMinutes: 5, linkMaxUses: 3, otpTtlMinutes: 5, otpMaxAttempts: 5,
  retentionDays: 180, followUpHours: 48, requireReauthForClinical: true,
});
const empty = (): DB => ({
  version: 1, users: [], sessions: [], labs: [], patients: [], results: [], reviewTasks: [], authorizations: [],
  secureAccess: [], accessLogs: [], notifications: [], followUps: [], syncQueue: [], links: [], assistedCodes: [],
  settings: defaultSettings(),
});

export function readDB(): DB {
  try { const db = JSON.parse(fs.readFileSync(FILE, 'utf8')); return { ...empty(), ...db, settings: { ...defaultSettings(), ...(db.settings || {}) } }; }
  catch { return empty(); }
}
function writeDB(db: DB) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = FILE + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, FILE);
}
export function mutate<T>(fn: (db: DB) => T): T {
  const db = readDB();
  const r = fn(db);
  writeDB(db);
  return r;
}
export function resetDB(db?: DB) { writeDB(db || empty()); }
export const nowISO = () => new Date().toISOString();
