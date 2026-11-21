'use client';
// Cliente HTTP: toda mutación lleva el encabezado anti-CSRF.
export async function apiFetch<T = any>(url: string, opts: { method?: string; body?: any; form?: FormData } = {}): Promise<T> {
  const r = await fetch(url, {
    method: opts.method || (opts.body || opts.form ? 'POST' : 'GET'),
    headers: { 'x-lumen-csrf': '1', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
    body: opts.form || (opts.body ? JSON.stringify(opts.body) : undefined), credentials: 'same-origin',
  });
  const t = await r.text();
  let d: any = {}; try { d = t ? JSON.parse(t) : {}; } catch { d = { error: t }; }
  if (!r.ok) { const e: any = new Error(d.error || 'Error ' + r.status); e.status = r.status; e.data = d; throw e; }
  return d;
}
export const fetcher = (u: string) => apiFetch(u);
export const fmt = (iso?: string | null, withTime = true) => (iso ? new Date(iso).toLocaleString('es-MX', withTime ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'medium' }) : '—');
export const dmy = (iso?: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');
