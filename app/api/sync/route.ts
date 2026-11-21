import { z } from 'zod';
import { api, body, json, reqMeta } from '@/lib/http';
import { requireRole, actor } from '@/lib/auth';
import { readDB, mutate, nowISO } from '@/lib/store';
import { audit } from '@/lib/audit';
import { newId } from '@/lib/crypto';

// Sincronización de la fila offline de brigada. Detección de conflicto por campo:
// si el servidor cambió el mismo campo después de la versión que vio el dispositivo, NO se sobrescribe.
const Op = z.object({ opId: z.string().max(60), type: z.enum(['createPatient', 'updatePatient', 'registerContact']), entityId: z.string().max(60).optional(), baseVersion: z.number().int().optional(), baseTime: z.string().optional(), fields: z.record(z.string(), z.any()), clientUpdatedAt: z.string() });
const EDITABLE = ['phone', 'email', 'municipality', 'digitalAccess'];

export const POST = api(async (req) => {
  const s = requireRole(req, ['captura', 'admin']);
  const { ops } = await body(req, z.object({ ops: z.array(Op).max(200) }));
  const results: any[] = [];
  for (const op of ops) {
    if (readDB().syncQueue.some((q) => q.opId === op.opId)) { results.push({ opId: op.opId, status: 'duplicate' }); continue; }
    const out = mutate((db) => {
      const rec: any = { id: newId('sq_'), opId: op.opId, operationType: op.type, payload: op, clientUpdatedAt: op.clientUpdatedAt, serverUpdatedAt: nowISO(), status: 'synced', conflictData: null, attempts: 1, createdAt: nowISO(), by: s.user.id };
      if (op.type === 'createPatient') {
        const f = op.fields;
        const p = { id: newId('pac_'), internalCode: 'EIRA-' + Math.random().toString(36).slice(2, 7).toUpperCase(), fictitious: true, fullName: String(f.fullName).slice(0, 120), dateOfBirth: f.dateOfBirth, curp: null, phone: f.phone ? '+52' + String(f.phone).replace(/\D/g, '').slice(-10) : null, email: f.email || null, municipality: f.municipality || '', digitalAccess: f.digitalAccess || 'completo', consentFlags: { sms: !!f.phone, email: !!f.email, whatsapp: false, camera: false, research_anon: true, signedAt: op.clientUpdatedAt, version: 'v1-demo' }, channelOrder: ['sms', 'email', 'whatsapp'], identityVerificationLevel: 'basic', visits: f.sampleFolio ? [{ id: newId('vis_'), jornada: 'Brigada offline', sampleFolio: f.sampleFolio, collectedAt: f.collectedAt || op.clientUpdatedAt.slice(0, 10), services: ['Papanicolaou'] }] : [], createdAt: op.clientUpdatedAt, createdBy: s.user.id, status: 'active', version: 1, updatedAt: nowISO(), fieldUpdatedAt: {}, createdOffline: true };
        db.patients.push(p); rec.entityId = p.id;
      } else if (op.type === 'updatePatient') {
        const p = db.patients.find((x) => x.id === op.entityId);
        if (!p) { rec.status = 'error'; rec.conflictData = { reason: 'Paciente no existe' }; }
        else {
          const conflicts: any[] = [];
          for (const [k, v] of Object.entries(op.fields)) {
            if (!EDITABLE.includes(k)) continue;
            const changedAt = p.fieldUpdatedAt?.[k];
            if (changedAt && op.baseTime && changedAt > op.baseTime && p[k] !== v) conflicts.push({ field: k, serverValue: p[k], clientValue: v, serverChangedAt: changedAt });
          }
          if (conflicts.length) { rec.status = 'conflict'; rec.entityId = p.id; rec.conflictData = { patientName: p.fullName, conflicts }; }
          else { for (const [k, v] of Object.entries(op.fields)) if (EDITABLE.includes(k)) { p[k] = v; p.fieldUpdatedAt = { ...(p.fieldUpdatedAt || {}), [k]: nowISO() }; } p.version++; p.updatedAt = nowISO(); rec.entityId = p.id; }
        }
      } else {
        const f = db.followUps.find((x) => x.id === op.entityId);
        if (f) { f.contactAttempts++; f.lastContactAt = op.clientUpdatedAt; f.notes = (f.notes || '') + ' · (offline) ' + String(op.fields.notes || 'contacto registrado').slice(0, 200); f.updatedAt = nowISO(); rec.entityId = f.id; }
        else rec.status = 'error';
      }
      db.syncQueue.push(rec); return rec;
    });
    audit({ ...actor(s), action: out.status === 'conflict' ? 'sync.conflicto_detectado' : 'sync.' + op.type, entityType: 'OfflineSyncQueue', entityId: out.id, after: { opId: op.opId, status: out.status, entityId: out.entityId }, ...reqMeta(req) });
    results.push({ opId: op.opId, status: out.status, entityId: out.entityId, conflictId: out.status === 'conflict' ? out.id : undefined });
  }
  return json({ results });
});
