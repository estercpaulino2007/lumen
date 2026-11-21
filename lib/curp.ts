// Validación REAL de la CURP mexicana (estructura RENAPO + dígito verificador).
// Se usa como control de calidad: detecta errores de captura del laboratorio
// (p. ej., fecha de nacimiento del documento distinta de la codificada en la CURP).
export const STATES: Record<string, string> = {
  AS: 'Aguascalientes', BC: 'Baja California', BS: 'Baja California Sur', CC: 'Campeche', CL: 'Coahuila', CM: 'Colima',
  CS: 'Chiapas', CH: 'Chihuahua', DF: 'Ciudad de México', DG: 'Durango', GT: 'Guanajuato', GR: 'Guerrero', HG: 'Hidalgo',
  JC: 'Jalisco', MC: 'Estado de México', MN: 'Michoacán', MS: 'Morelos', NT: 'Nayarit', NL: 'Nuevo León', OC: 'Oaxaca',
  PL: 'Puebla', QT: 'Querétaro', QR: 'Quintana Roo', SP: 'San Luis Potosí', SL: 'Sinaloa', SR: 'Sonora', TC: 'Tabasco',
  TS: 'Tamaulipas', TL: 'Tlaxcala', VZ: 'Veracruz', YN: 'Yucatán', ZS: 'Zacatecas', NE: 'Nacida en el extranjero',
};
const RE = /^([A-Z][AEIOUX][A-Z]{2})(\d{2})(\d{2})(\d{2})([HMX])([A-Z]{2})([B-DF-HJ-NP-TV-Z]{3})([A-Z0-9])(\d)$/;
const DICT = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';

export function checkDigit(curp17: string) {
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += DICT.indexOf(curp17[i]) * (18 - i);
  const d = 10 - (sum % 10);
  return d === 10 ? 0 : d;
}

export function validateCurp(raw: string | null | undefined) {
  const curp = String(raw || '').toUpperCase().replace(/\s/g, '');
  if (!curp) return { ok: false, reason: 'vacía' as const };
  const m = curp.match(RE);
  if (!m) return { ok: false, curp, reason: 'Formato inválido (18 caracteres, estructura RENAPO)' };
  const [, , yy, mm, dd, sex, st, , homo, dv] = m;
  if (!STATES[st]) return { ok: false, curp, reason: `Entidad "${st}" inexistente` };
  const century = /[A-Z]/.test(homo) ? 2000 : 1900;
  const birth = `${century + +yy}-${mm}-${dd}`;
  const dt = new Date(birth + 'T00:00:00Z');
  if (isNaN(+dt) || dt.getUTCMonth() + 1 !== +mm) return { ok: false, curp, reason: 'Fecha codificada inválida' };
  if (checkDigit(curp.slice(0, 17)) !== +dv) return { ok: false, curp, reason: 'Dígito verificador incorrecto (posible error de captura)' };
  return { ok: true, curp, birth, sex, state: STATES[st] };
}

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
const firstInnerVowel = (s: string) => (s.slice(1).match(/[AEIOU]/) || ['X'])[0];
const firstInnerCons = (s: string) => (s.slice(1).match(/[B-DF-HJ-NP-TV-Z]/) || ['X'])[0];

/** Genera una CURP SINTÉTICA con estructura y dígito verificador válidos (para personas ficticias). */
export function syntheticCurp(nombre: string, apP: string, apM: string, dob: string, state = 'NL') {
  const n = strip(nombre.split(' ')[0]), p = strip(apP), mth = strip(apM || 'X');
  const [y, mo, d] = dob.split('-');
  const homo = +y >= 2000 ? 'A' : '0';
  const base = p[0] + firstInnerVowel(p) + mth[0] + n[0] + y.slice(2) + mo + d + 'M' + state + firstInnerCons(p) + firstInnerCons(mth) + firstInnerCons(n) + homo;
  return base + checkDigit(base);
}
