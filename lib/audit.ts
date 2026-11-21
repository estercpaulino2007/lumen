import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DATA_DIR } from './store';

// Bitácora append-only encadenada: cada evento incluye el hash del anterior (como un libro contable).
// Borrar, editar o reordenar cualquier línea rompe la cadena y se detecta con verifyChain().
// No existe ninguna ruta de la API que edite o borre eventos. Nunca guarda contenido clínico.
const FILE = path.join(DATA_DIR, 'audit.jsonl');

export type AuditInput = {
  actorRole: string; actorId: string; action: string; entityType: string; entityId: string;
  before?: any; after?: any; reason?: string | null; ipAddressHash?: string | null; userAgentHash?: string | null;
};
const hashOf = (e: any) => { const { hash, ...rest } = e; return crypto.createHash('sha256').update(JSON.stringify(rest)).digest('hex'); };

function tail(): { seq: number; hash: string } {
  if (!fs.existsSync(FILE)) return { seq: 0, hash: 'GENESIS' };
  const lines = fs.readFileSync(FILE, 'utf8').trimEnd().split('\n').filter(Boolean);
  if (!lines.length) return { seq: 0, hash: 'GENESIS' };
  const last = JSON.parse(lines[lines.length - 1]);
  return { seq: last.seq, hash: last.hash };
}

export function audit(ev: AuditInput, at: Date = new Date()) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const t = tail();
  const e: any = {
    seq: t.seq + 1, id: 'ae_' + crypto.randomBytes(6).toString('hex'), createdAt: at.toISOString(),
    actorRole: ev.actorRole, actorId: ev.actorId, action: ev.action, entityType: ev.entityType, entityId: ev.entityId,
    before: ev.before ?? null, after: ev.after ?? null, reason: ev.reason ?? null,
    ipAddressHash: ev.ipAddressHash ?? null, userAgentHash: ev.userAgentHash ?? null, prev: t.hash,
  };
  e.hash = hashOf(e);
  fs.appendFileSync(FILE, JSON.stringify(e) + '\n');
  return e;
}

export function readAudit(): any[] {
  if (!fs.existsSync(FILE)) return [];
  return fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

export function verifyChain() {
  const rows = fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean) : [];
  let prev = 'GENESIS';
  for (let i = 0; i < rows.length; i++) {
    let e: any;
    try { e = JSON.parse(rows[i]); } catch { return { ok: false, count: rows.length, brokenAt: i + 1, reason: 'Línea ilegible' }; }
    if (e.prev !== prev) return { ok: false, count: rows.length, brokenAt: e.seq, reason: 'El enlace con el evento anterior no coincide (evento borrado o reordenado)' };
    if (hashOf(e) !== e.hash) return { ok: false, count: rows.length, brokenAt: e.seq, reason: 'El contenido del evento fue modificado' };
    prev = e.hash;
  }
  return { ok: true, count: rows.length, head: prev };
}
export function resetAudit() { if (fs.existsSync(FILE)) fs.unlinkSync(FILE); }
