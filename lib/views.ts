import { DB } from './store';
// Proyecciones por rol: el backend decide qué ve cada quien (nunca la interfaz).
export function resultView(db: DB, r: any, role: string) {
  const p = r.patientId ? db.patients.find((x) => x.id === r.patientId) : null;
  const base = {
    id: r.id, labId: r.labId, labName: r.labName, examType: r.examType, collectedAt: r.collectedAt, receivedAt: r.receivedAt,
    originalFileName: r.originalFileName, fileHash: r.fileHash, ocrStatus: r.ocrStatus, ocrConfidence: r.ocrConfidence, quality: r.quality,
    qualityIssues: r.qualityIssues, associationStatus: r.associationStatus, reviewStatus: r.reviewStatus, clinicalStatus: r.clinicalStatus,
    deliveryStatus: r.deliveryStatus, accessCount: r.accessCount, downloadCount: r.downloadCount, correctionNote: r.correctionNote || null,
    timeline: r.timeline, updatedAt: r.updatedAt, pages: r.pages, followUpRequired: r.followUpRequired,
  };
  if (role === 'lab') return { ...base, extracted: r.ocrExtractedJson }; // el laboratorio no ve candidatas ni datos de otras pacientes
  return {
    ...base, extracted: r.ocrExtractedJson, associationScore: r.associationScore, associationExplanation: r.associationExplanation,
    candidates: r.candidates, risk: r.risk, confirmedBy: r.confirmedBy || null,
    patient: p ? { id: p.id, fullName: p.fullName, internalCode: p.internalCode, municipality: p.municipality, digitalAccess: p.digitalAccess, phoneMasked: p.phone ? '••' + p.phone.slice(-4) : null, hasEmail: !!p.email } : null,
  };
}
export function stageOf(r: any) {
  if (r.associationStatus === 'rejected') return 'rejected';
  if (r.clinicalStatus === 'blocked') return 'blocked';
  if (r.clinicalStatus === 'authorized') return 'delivery';
  if (r.reviewStatus === 'approved') return 'clinical';
  return 'review';
}
