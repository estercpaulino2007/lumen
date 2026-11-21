import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { metaHash } from './crypto';

export class HttpError extends Error { constructor(public status: number, message: string, public extra?: any) { super(message); } }
export const json = (data: any, status = 200, headers: Record<string, string> = {}) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

export function reqMeta(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
  return { ip, ipAddressHash: metaHash(ip), userAgentHash: metaHash(req.headers.get('user-agent')) };
}

/** CSRF: toda mutación exige el encabezado personalizado (imposible de enviar entre sitios sin CORS) y Origin coherente. */
export function assertCsrf(req: NextRequest) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
  if (req.headers.get('x-lumen-csrf') !== '1') throw new HttpError(403, 'Solicitud rechazada (protección CSRF).');
  const origin = req.headers.get('origin');
  if (origin) { const host = req.headers.get('x-forwarded-host') || req.headers.get('host'); if (new URL(origin).host !== host) throw new HttpError(403, 'Origen no permitido.'); }
}

export async function body<T>(req: NextRequest, schema: z.ZodType<T>): Promise<T> {
  let raw: any;
  try { raw = await req.json(); } catch { throw new HttpError(400, 'JSON inválido.'); }
  const r = schema.safeParse(raw);
  if (!r.success) throw new HttpError(400, 'Datos inválidos: ' + r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; '));
  return r.data;
}

export function api(fn: (req: NextRequest, ctx: any) => Promise<Response>) {
  return async (req: NextRequest, ctx: any) => {
    try { assertCsrf(req); return await fn(req, ctx); }
    catch (e: any) {
      if (e instanceof HttpError) return json({ error: e.message, ...(e.extra || {}) }, e.status);
      console.error(e); return json({ error: 'Error interno.' }, 500);
    }
  };
}
