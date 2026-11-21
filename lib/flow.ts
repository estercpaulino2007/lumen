import { readDB, mutate, DB } from './store';
import { storage } from './storage';
import { sha256, newId } from './crypto';
import { extractPdf, qualityLabel } from './extract';
import { suggest, explain } from './match';
import { audit } from './audit';
import { sendToPatient } from './notify';
import { HttpError } from './http';

// Flujo de dominio. Las rutas de la API y la semilla usan EXACTAMENTE estas funciones.
type A = { actorRole: string; actorId: string; ipAddressHash?: string | null; userAgentHash?: string | null };
const iso = (d?: Date) => (d || new Date()).toISOString();

export async function ingestPdf(o: { buf: Buffer; fileName: string; labId: string; actor: A; at?: Date }) {
  const hash = sha256(o.buf);
  const db0 = readDB();
  const dup = db0.results.find((r) => r.fileHash === hash);
  if (dup) {
    audit({ ...o.actor, action: 'carga.duplicada_rechazada', entityType: 'LabResult', entityId: dup.id, after: { fileHash: hash } }, o.at);
    throw new HttpError(409, 'Este archivo ya fue cargado (mismo hash SHA-256).', { duplicateOf: dup.id });
  }
  const lab = db0.labs.find((l) => l.id === o.labId);
  const id = newId('res_');
  const storagePath = await storage.put(id, o.buf);
  const r = {
    id, patientId: null, labId: o.labId, labName: lab?.name || o.labId, examType: 'PAPANICOLAOU', collectedAt: null, receivedAt: iso(o.at),
    originalFileName: o.fileName.slice(0, 120), storagePath, fileHash: hash, fileSize: o.buf.length,
    ocrStatus: 'processing', ocrExtractedJson: null, ocrConfidence: null, qualityIssues: [], quality: null,
    associationStatus: 'pending', associationScore: null, associationExplanation: null, candidates: [], risk: null,
    reviewStatus: 'pending', clinicalStatus: 'pending', deliveryStatus: 'not_sent', accessCount: 0, downloadCount: 0,
    followUpRequired: false, createdAt: iso(o.at), updatedAt: iso(o.at), timeline: {} as Record<string, string>,
  };
  r.timeline.received = r.receivedAt;
  mutate((db) => { db.results.push(r); });
  audit({ ...o.actor, action: 'resultado.cargado', entityType: 'LabResult', entityId: id, after: { fileName: r.originalFileName, sha256: hash, bytes: o.buf.length, labId: o.labId } }, o.at);
  return r;
}

export async function processResult(id: string, at?: Date) {
  const r0 = readDB().results.find((r) => r.id === id);
  if (!r0) return;
  const buf = await storage.get(r0.storagePath);
  const ex = await extractPdf(buf);
  mutate((db) => {
    const r = db.results.find((x) => x.id === id)!;
    const issues = [...ex.issues];
    if (ex.fields.folioLaudo && db.results.some((x) => x.id !== id && x.ocrExtractedJson?.folioLaudo === ex.fields.folioLaudo))
      issues.push({ level: 'error', code: 'posible_duplicado', msg: `Ya existe otro documento con el folio de laudo ${ex.fields.folioLaudo}.` });
    r.ocrStatus = ex.ok ? (ex.hasText ? 'done' : 'needs_ocr') : 'failed';
    r.ocrExtractedJson = ex.fields; r.ocrConfidence = ex.confidence; r.pages = ex.pages;
    r.collectedAt = ex.fields.fechaToma || null;
    const s = suggest(ex.fields, db.patients);
    r.candidates = s.candidates; r.risk = ex.ok && ex.hasText ? s.risk : 'alto';
    if (s.candidates[0] && s.candidates[0].factors[0].value < 0.85 && ex.fields.nombre) issues.push({ level: 'warn', code: 'nombre_divergente', msg: 'El nombre del documento difiere del registro de la candidata principal.' });
    r.qualityIssues = issues; r.quality = qualityLabel(issues);
    if (s.candidates[0]) { r.associationScore = s.candidates[0].score; r.associationExplanation = { lines: explain(s.candidates[0]), notes: s.notes, suggestedPatientId: s.candidates[0].patientId }; r.associationStatus = 'suggested'; }
    else r.associationExplanation = { lines: [], notes: s.notes };
    r.updatedAt = iso(at); r.timeline.processed = iso(at);
    db.reviewTasks.push({ id: newId('rt_'), resultId: id, assignedTo: null, status: 'pending', priority: r.quality === 'mala' || r.risk === 'alto' ? 'alta' : 'normal', issueType: issues[0]?.code || null, notes: null, resolution: null, resolvedAt: null, createdAt: iso(at) });
  });
  const r = readDB().results.find((x) => x.id === id)!;
  audit({ actorRole: 'sistema', actorId: 'extractor', action: r.ocrStatus === 'failed' ? 'ocr.fallido' : 'ocr.completado', entityType: 'LabResult', entityId: id, after: { confidence: r.ocrConfidence, quality: r.quality, issues: r.qualityIssues.map((i: any) => i.code) } }, at);
  if (r.associationExplanation?.suggestedPatientId) audit({ actorRole: 'sistema', actorId: 'asociador', action: 'asociacion.sugerida', entityType: 'LabResult', entityId: id, after: { patientId: r.associationExplanation.suggestedPatientId, score: r.associationScore, risk: r.risk } }, at);
}

export function associate(id: string, action: 'confirm' | 'manual' | 'reject' | 'correction', o: { patientId?: string; note?: string; actor: A; at?: Date }) {
  const res = mutate((db) => {
    const r = db.results.find((x) => x.id === id);
    if (!r) throw new HttpError(404, 'Resultado no encontrado.');
    if (r.clinicalStatus === 'authorized') throw new HttpError(409, 'El resultado ya fue autorizado; la asociación no se puede cambiar sin revocar.');
    const before = { associationStatus: r.associationStatus, patientId: r.patientId, reviewStatus: r.reviewStatus };
    const task = db.reviewTasks.find((t) => t.resultId === id && t.status === 'pending');
    if (action === 'confirm') {
      const pid = o.patientId || r.associationExplanation?.suggestedPatientId;
      const p = db.patients.find((x) => x.id === pid);
      if (!p) throw new HttpError(400, 'Selecciona una paciente válida.');
      if (r.quality === 'mala' && !o.note) throw new HttpError(400, 'El documento tiene problemas de calidad: escribe una nota justificando la confirmación.');
      r.patientId = p.id; r.associationStatus = o.patientId && o.patientId !== r.associationExplanation?.suggestedPatientId ? 'confirmed_manual' : 'confirmed';
      r.reviewStatus = 'approved'; r.confirmedBy = o.actor.actorId; r.timeline.reviewed = iso(o.at);
      if (task) Object.assign(task, { status: 'resolved', resolution: 'asociacion_confirmada', resolvedAt: iso(o.at), notes: o.note || null, assignedTo: o.actor.actorId });
    } else if (action === 'manual') {
      r.associationStatus = 'manual_review'; if (task) Object.assign(task, { priority: 'alta', notes: o.note || 'Marcado para revisión manual', assignedTo: o.actor.actorId });
    } else if (action === 'reject') {
      r.associationStatus = 'rejected'; r.patientId = null; r.reviewStatus = 'rejected';
      if (task) Object.assign(task, { status: 'resolved', resolution: 'asociacion_rechazada', resolvedAt: iso(o.at), notes: o.note || null });
    } else {
      if (!o.note) throw new HttpError(400, 'Describe qué debe corregir el laboratorio.');
      r.associationStatus = 'correction_requested'; r.reviewStatus = 'correction_requested'; r.correctionNote = o.note;
      if (task) Object.assign(task, { issueType: 'correccion_laboratorio', notes: o.note, assignedTo: r.labId });
    }
    r.updatedAt = iso(o.at);
    return { r, before };
  });
  const map = { confirm: 'asociacion.confirmada', manual: 'asociacion.revision_manual', reject: 'asociacion.rechazada', correction: 'correccion.solicitada' };
  audit({ ...o.actor, action: map[action], entityType: 'LabResult', entityId: id, before: res.before, after: { associationStatus: res.r.associationStatus, patientId: res.r.patientId }, reason: o.note || null }, o.at);
  return res.r;
}

export function clinicalDecision(id: string, decision: 'authorize' | 'return' | 'block', o: { reason: string; followUp?: boolean; actor: A; at?: Date }) {
  const out = mutate((db) => {
    const r = db.results.find((x) => x.id === id);
    if (!r) throw new HttpError(404, 'Resultado no encontrado.');
    if (r.reviewStatus !== 'approved' || !r.patientId) throw new HttpError(409, 'Primero la revisión administrativa debe confirmar la asociación.');
    if (r.clinicalStatus === 'authorized') throw new HttpError(409, 'Ya autorizado.');
    // Control de cuatro ojos: quien confirmó la asociación no puede autorizar la entrega.
    if (r.confirmedBy === o.actor.actorId) throw new HttpError(403, 'Doble control: la misma persona no puede confirmar la asociación y autorizar la entrega.');
    const before = { clinicalStatus: r.clinicalStatus };
    const auth = { id: newId('ca_'), resultId: id, authorizedBy: o.actor.actorId, decision, reason: o.reason, authorizedAt: iso(o.at) };
    db.authorizations.push(auth);
    if (decision === 'authorize') { r.clinicalStatus = 'authorized'; r.timeline.authorized = iso(o.at); r.followUpRequired = !!o.followUp; }
    else if (decision === 'return') { r.clinicalStatus = 'returned'; r.reviewStatus = 'pending'; r.associationStatus = 'manual_review'; db.reviewTasks.push({ id: newId('rt_'), resultId: id, assignedTo: null, status: 'pending', priority: 'alta', issueType: 'devuelto_por_clinica', notes: o.reason, resolution: null, resolvedAt: null, createdAt: iso(o.at) }); }
    else { r.clinicalStatus = 'blocked'; r.deliveryStatus = 'blocked'; }
    r.updatedAt = iso(o.at);
    if (decision === 'authorize' && o.followUp) db.followUps.push({ id: newId('fu_'), patientId: r.patientId, resultId: id, reason: 'contacto_indicado_por_profesional', priority: 'alta', dueAt: new Date((o.at || new Date()).getTime() + 7 * 86400_000).toISOString(), status: 'open', assignedTo: null, contactAttempts: 0, lastContactAt: null, notes: 'La profesional de salud indicó contactar a la paciente para cita de seguimiento. (El motivo clínico no se registra aquí.)', createdAt: iso(o.at), updatedAt: iso(o.at) });
    return { r, before, auth };
  });
  audit({ ...o.actor, action: { authorize: 'autorizacion.clinica', return: 'autorizacion.devuelta', block: 'entrega.bloqueada' }[decision], entityType: 'LabResult', entityId: id, before: out.before, after: { clinicalStatus: out.r.clinicalStatus, followUp: !!o.followUp }, reason: o.reason }, o.at);
  if (decision === 'authorize') notifyResult(id, { actor: o.actor, at: o.at });
  return readDB().results.find((x) => x.id === id);
}

export function notifyResult(id: string, o: { actor?: A; at?: Date; kind?: 'aviso' | 'recordatorio' } = {}) {
  return mutate((db) => {
    const r = db.results.find((x) => x.id === id)!;
    const p = db.patients.find((x) => x.id === r.patientId)!;
    const n = sendToPatient(db, p, o.kind || 'aviso', { resultId: id, at: o.at, actor: o.actor as any });
    if (n.status === 'entregado') { if (r.deliveryStatus === 'not_sent' || r.deliveryStatus === 'failed' || r.deliveryStatus === 'assisted_pending') r.deliveryStatus = 'notified'; r.timeline.notified = r.timeline.notified || iso(o.at); }
    else if (n.status === 'asistida') r.deliveryStatus = 'assisted_pending';
    else r.deliveryStatus = 'failed';
    return n;
  });
}

/** Barrido de seguimiento: avisos sin consultar después del umbral generan tarea para EIRA. */
export function followUpSweep(db: DB, now = new Date()) {
  const lim = db.settings.followUpHours * 3600_000;
  let created = 0;
  for (const r of db.results) {
    if (r.deliveryStatus !== 'notified' || !r.timeline?.notified) continue;
    if (now.getTime() - new Date(r.timeline.notified).getTime() < lim) continue;
    if (db.followUps.some((f) => f.resultId === r.id && f.reason === 'no_acceso_48h')) continue;
    db.followUps.push({ id: newId('fu_'), patientId: r.patientId, resultId: r.id, reason: 'no_acceso_48h', priority: 'normal', dueAt: new Date(now.getTime() + 48 * 3600_000).toISOString(), status: 'open', assignedTo: null, contactAttempts: 0, lastContactAt: null, notes: `La paciente no ha consultado su documento ${db.settings.followUpHours} h después del aviso.`, createdAt: now.toISOString(), updatedAt: now.toISOString() });
    audit({ actorRole: 'sistema', actorId: 'seguimiento', action: 'seguimiento.creado', entityType: 'LabResult', entityId: r.id, after: { reason: 'no_acceso_48h' } }, now);
    created++;
  }
  return created;
}
