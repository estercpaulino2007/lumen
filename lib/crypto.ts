import crypto from 'crypto';

// Clave maestra: deriva subclaves independientes (cifrado, firma, seudónimos, OTP).
// En piloto vive en un gestor de secretos (KMS); aquí se lee de LUMEN_MASTER_KEY.
let MASTER: Buffer;
const env = process.env.LUMEN_MASTER_KEY || '';
if (/^[0-9a-f]{64}$/i.test(env)) MASTER = Buffer.from(env, 'hex');
else if (env.length >= 32) MASTER = crypto.createHash('sha256').update(env).digest(); // p. ej. valor generado por Render
else MASTER = crypto.createHash('sha256').update('lumen-demo-key-NO-USAR-EN-PRODUCCION').digest();
export const usingDemoKey = env.length < 32;

const sub = (label: string) => crypto.createHmac('sha256', MASTER).update(label).digest();
const ENC = sub('enc'), SIGN = sub('sign'), PSEUDO = sub('pseudo'), OTP = sub('otp'), META = sub('meta');

/** AES-256-GCM: [iv 12][tag 16][ciphertext]. Los PDFs se guardan cifrados en reposo. */
export function encrypt(buf: Buffer): Buffer {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', ENC, iv);
  const ct = Buffer.concat([c.update(buf), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]);
}
export function decrypt(blob: Buffer): Buffer {
  const d = crypto.createDecipheriv('aes-256-gcm', ENC, blob.subarray(0, 12));
  d.setAuthTag(blob.subarray(12, 28));
  return Buffer.concat([d.update(blob.subarray(28)), d.final()]);
}

/** Token firmado HMAC (para enlaces de corta duración). */
export function sign(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return body + '.' + crypto.createHmac('sha256', SIGN).update(body).digest('base64url');
}
export function verifySigned<T = any>(token: string): T | null {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const exp = crypto.createHmac('sha256', SIGN).update(body).digest('base64url');
  if (!sig || sig.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (p.exp && Date.now() > p.exp) return null;
    return p;
  } catch { return null; }
}

export const sha256 = (b: Buffer | string) => crypto.createHash('sha256').update(b).digest('hex');
/** Seudónimo estable e irreversible sin la clave (para exportaciones anonimizadas). */
export const pseudonym = (id: string) => 'P-' + crypto.createHmac('sha256', PSEUDO).update(id).digest('hex').slice(0, 10).toUpperCase();
/** Hash de metadatos (IP, user agent): permite correlacionar abuso sin guardar el dato. */
export const metaHash = (v: string | null | undefined) => (v ? crypto.createHmac('sha256', META).update(v).digest('hex').slice(0, 16) : null);
export const otpCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
export const otpHash = (salt: string, code: string) => crypto.createHmac('sha256', OTP).update(salt + ':' + code).digest('hex');
export const safeEqual = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
export const newId = (prefix = '') => prefix + crypto.randomBytes(9).toString('base64url');
export const randomToken = () => crypto.randomBytes(32).toString('base64url');
/** Código asistido legible (sin 0/O/1/I para evitar confusiones al dictarlo). */
export function assistedCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const s = Array.from(crypto.randomBytes(8), (b) => A[b % A.length]).join('');
  return s.slice(0, 4) + '-' + s.slice(4);
}
