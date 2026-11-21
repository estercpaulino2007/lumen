import { api, reqMeta, HttpError } from '@/lib/http';
import { requireRole, actor } from '@/lib/auth';
import { readDB, mutate, nowISO } from '@/lib/store';
import { storage } from '@/lib/storage';
import { watermark } from '@/lib/pdfgen';
import { audit } from '@/lib/audit';
import { newId } from '@/lib/crypto';

// Visualización interna (personal autorizado). Marca de agua con la persona que consulta.
export const GET = api(async (req, ctx) => {
  const s = requireRole(req, ['lab', 'captura', 'clinico', 'admin']);
  const { id } = await ctx.params;
  const r = readDB().results.find((x) => x.id === id);
  if (!r || (s.role === 'lab' && r.labId !== s.user.labId)) throw new HttpError(404, 'No encontrado.');
  let buf = await storage.get(r.storagePath);
  const stamp = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
  try { buf = await watermark(buf, ['LUMEN · USO INTERNO', s.user.name, stamp, 'Documento protegido']); } catch { /* PDF dañado: se entrega tal cual para diagnóstico */ }
  mutate((db) => db.accessLogs.push({ id: newId('al_'), resultId: id, patientId: r.patientId, action: 'staff_view', method: s.role, success: true, createdAt: nowISO(), ...reqMeta(req), metadata: { userId: s.user.id } }));
  audit({ ...actor(s), action: 'documento.consultado_personal', entityType: 'LabResult', entityId: id, ...reqMeta(req) });
  return new Response(new Uint8Array(buf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="documento-protegido.pdf"', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'X-Frame-Options': 'SAMEORIGIN' } });
});
