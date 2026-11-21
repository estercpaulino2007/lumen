import { api, json, reqMeta, HttpError } from '@/lib/http';
import { requireRole, actor } from '@/lib/auth';
import { ingestPdf, processResult } from '@/lib/flow';
import { enqueue } from '@/lib/queue';
import { rateLimited } from '@/lib/kv';

const MAX = 10 * 1024 * 1024;
export const POST = api(async (req) => {
  const s = requireRole(req, ['lab']);
  if (await rateLimited('upload:' + s.user.id, 60, 3600)) throw new HttpError(429, 'Límite de cargas por hora alcanzado.');
  const fd = await req.formData();
  const file = fd.get('file');
  if (!file || typeof file === 'string') throw new HttpError(400, 'Adjunta un archivo PDF.');
  const name = (file as File).name || 'documento.pdf';
  if (!/\.pdf$/i.test(name)) throw new HttpError(415, 'Solo se aceptan archivos con extensión .pdf.');
  if ((file as File).type && (file as File).type !== 'application/pdf') throw new HttpError(415, 'Tipo MIME no permitido: se espera application/pdf.');
  if ((file as File).size > MAX) throw new HttpError(413, 'El archivo supera 10 MB.');
  const buf = Buffer.from(await (file as File).arrayBuffer());
  if (buf.subarray(0, 5).toString() !== '%PDF-') throw new HttpError(415, 'El contenido no es un PDF (firma de archivo inválida).');
  const r = await ingestPdf({ buf, fileName: name.replace(/[^\w.\- ]/g, '_'), labId: s.user.labId, actor: { ...actor(s), ...reqMeta(req) } });
  enqueue('ocr', () => processResult(r.id));
  return json({ id: r.id, status: 'processing' }, 202);
});
