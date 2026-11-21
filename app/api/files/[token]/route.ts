import { NextRequest } from 'next/server';
import { reqMeta } from '@/lib/http';
import { getSession } from '@/lib/auth';
import { readDB, mutate, nowISO } from '@/lib/store';
import { verifySigned } from '@/lib/crypto';
import { storage } from '@/lib/storage';
import { watermark } from '@/lib/pdfgen';
import { accessLog } from '@/lib/portal';
import { audit } from '@/lib/audit';

const deny = (msg: string, status = 403) => new Response(`<!doctype html><meta charset=utf-8><body style="font-family:system-ui;background:#0B0B0F;color:#F8FAFC;display:grid;place-items:center;height:100vh"><div style="max-width:420px;text-align:center"><h2>LUMEN</h2><p>${msg}</p><p style="color:#94A3B8">Vuelve al portal seguro para generar un nuevo acceso.</p></div>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const m = reqMeta(req);
  const p = verifySigned<{ jti: string }>(token);
  const db = readDB();
  const l = p && db.links.find((x) => x.jti === p.jti);
  const fail = (reason: string, msg: string, status = 403) => { mutate((d) => accessLog(d, { resultId: l?.resultId || null, patientId: l?.patientId || null, action: 'link_denied', method: 'signed_url', success: false, ...m, metadata: { reason } })); audit({ actorRole: 'anonimo', actorId: 'n/a', action: 'enlace.rechazado', entityType: 'Link', entityId: l?.jti || 'desconocido', after: { reason }, ...m }); return deny(msg, status); };
  if (!p || !l) return fail('firma_invalida_o_vencida', 'Este enlace no es válido o ya venció (duran 5 minutos).', 410);
  if (l.revokedAt) return fail('revocado', 'Este acceso fue revocado por seguridad.');
  if (l.uses >= l.maxUses) return fail('usos_agotados', 'Este enlace ya se usó el número máximo de veces.');
  const s = getSession(req);
  if (!s || s.role !== 'paciente' || s.patient?.id !== l.patientId) return fail('sesion_no_coincide', 'Para abrir el documento necesitas tu sesión segura en este dispositivo. Un enlace reenviado no funciona.', 401);
  const r = db.results.find((x) => x.id === l.resultId);
  if (!r || r.clinicalStatus !== 'authorized') return fail('no_autorizado', 'El documento ya no está disponible.');
  const dl = req.nextUrl.searchParams.get('dl') === '1';
  const patient = db.patients.find((x) => x.id === l.patientId)!;
  const stamp = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'short', timeStyle: 'short' });
  const pdf = await watermark(await storage.get(r.storagePath), ['LUMEN · Acceso registrado', stamp, 'Paciente ···' + patient.internalCode.split('-').pop(), 'Documento protegido']);
  mutate((d) => {
    const lk = d.links.find((x) => x.jti === l.jti)!; lk.uses++;
    const rr = d.results.find((x) => x.id === r.id)!;
    if (dl) { rr.downloadCount++; rr.deliveryStatus = 'downloaded'; } else { rr.accessCount++; if (rr.deliveryStatus !== 'downloaded') rr.deliveryStatus = 'accessed'; }
    rr.timeline.accessed = rr.timeline.accessed || nowISO();
    d.followUps.filter((f) => f.resultId === r.id && f.reason === 'no_acceso_48h' && f.status === 'open').forEach((f) => { f.status = 'closed'; f.notes += ' · Cerrado automáticamente: la paciente consultó su documento.'; f.updatedAt = nowISO(); });
    accessLog(d, { resultId: r.id, patientId: l.patientId, action: dl ? 'download' : 'view', method: s.session.method, success: true, ...m, metadata: { jti: l.jti, use: lk.uses } });
  });
  audit({ actorRole: 'paciente', actorId: l.patientId, action: dl ? 'documento.descargado' : 'documento.visualizado', entityType: 'LabResult', entityId: r.id, after: { jti: l.jti, method: s.session.method }, ...m });
  return new Response(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `${dl ? 'attachment' : 'inline'}; filename="LUMEN-documento-${patient.internalCode.split('-').pop()}.pdf"`, 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'SAMEORIGIN' } });
}
