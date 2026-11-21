// Almacén efímero con TTL para OTP, rate limiting y bloqueos temporales.
// Con VALKEY_URL usa Valkey (los secretos expiran solos y no tocan disco); si no, memoria del proceso.
type KV = { kind: string; get(k: string): Promise<string | null>; set(k: string, v: string, ttl: number): Promise<void>; incr(k: string, ttl: number): Promise<number>; del(k: string): Promise<void> };

class MemKV implements KV {
  kind = 'memoria (demo)';
  m = new Map<string, { v: string; exp: number }>();
  live(k: string) { const e = this.m.get(k); if (!e) return null; if (Date.now() > e.exp) { this.m.delete(k); return null; } return e; }
  async get(k: string) { return this.live(k)?.v ?? null; }
  async set(k: string, v: string, ttl: number) { this.m.set(k, { v, exp: Date.now() + ttl * 1000 }); }
  async incr(k: string, ttl: number) { const e = this.live(k); const n = (e ? +e.v : 0) + 1; this.m.set(k, { v: String(n), exp: e ? e.exp : Date.now() + ttl * 1000 }); return n; }
  async del(k: string) { this.m.delete(k); }
}
class ValkeyKV implements KV {
  kind = 'Valkey';
  c: any;
  constructor(url: string) { const Valkey = require('iovalkey'); this.c = new Valkey(url, { maxRetriesPerRequest: 2 }); }
  async get(k: string) { return this.c.get('lumen:' + k); }
  async set(k: string, v: string, ttl: number) { await this.c.set('lumen:' + k, v, 'EX', Math.ceil(ttl)); }
  async incr(k: string, ttl: number) { const n = await this.c.incr('lumen:' + k); if (n === 1) await this.c.expire('lumen:' + k, Math.ceil(ttl)); return n; }
  async del(k: string) { await this.c.del('lumen:' + k); }
}
const g = globalThis as any;
export const kv: KV = g.__lumenKV || (g.__lumenKV = (() => {
  if (process.env.VALKEY_URL) { try { return new ValkeyKV(process.env.VALKEY_URL); } catch (e: any) { console.warn('[kv] Valkey no disponible:', e.message); } }
  return new MemKV();
})());

/** Devuelve true si se excedió el límite. */
export async function rateLimited(key: string, max: number, windowSec: number) {
  return (await kv.incr('rl:' + key, windowSec)) > max;
}
