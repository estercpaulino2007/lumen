// Sugerencia de asociación documento ↔ paciente con puntaje EXPLICABLE.
// Fórmula acordada con la guía del reto:
//   0.40·nombre + 0.25·fecha nacimiento + 0.15·teléfono + 0.10·municipio + 0.10·folio o fecha de toma
// NUNCA asocia automáticamente: solo ordena candidatas para que una persona confirme.
export const norm = (s: any) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  .replace(/[^A-Z0-9 ]/g, ' ').replace(/\b(DE|DEL|LA|LAS|LOS|Y)\b/g, ' ').replace(/\s+/g, ' ').trim();
const digits = (s: any) => String(s || '').replace(/\D/g, '');

function jaro(a: string, b: string) {
  if (a === b) return 1;
  const la = a.length, lb = b.length; if (!la || !lb) return 0;
  const md = Math.max(0, Math.floor(Math.max(la, lb) / 2) - 1);
  const am = Array(la).fill(false), bm = Array(lb).fill(false); let m = 0;
  for (let i = 0; i < la; i++) for (let j = Math.max(0, i - md); j < Math.min(lb, i + md + 1); j++) if (!bm[j] && a[i] === b[j]) { am[i] = bm[j] = true; m++; break; }
  if (!m) return 0;
  let t = 0, k = 0;
  for (let i = 0; i < la; i++) if (am[i]) { while (!bm[k]) k++; if (a[i] !== b[k]) t++; k++; }
  return (m / la + m / lb + (m - t / 2) / m) / 3;
}
const jw = (a: string, b: string) => { const j = jaro(a, b); let p = 0; while (p < 4 && a[p] && a[p] === b[p]) p++; return j + p * 0.1 * (1 - j); };
/** Similitud de nombres tolerante a acentos, mayúsculas, orden de apellidos y errores de dedo. */
export function nameSim(a: string, b: string) {
  const ta = norm(a).split(' ').filter(Boolean), tb = norm(b).split(' ').filter(Boolean);
  if (!ta.length || !tb.length) return 0;
  const best = (x: string, ys: string[]) => Math.max(...ys.map((y) => jw(x, y)));
  return (ta.reduce((s, t) => s + best(t, tb), 0) / ta.length + tb.reduce((s, t) => s + best(t, ta), 0) / tb.length) / 2;
}

export type Factor = { key: string; label: string; value: number; weight: number; detail: string };
export function scoreCandidate(f: any, p: any) {
  const factors: Factor[] = [];
  const ns = f.nombre ? nameSim(f.nombre, p.fullName) : 0;
  factors.push({ key: 'nombre', label: 'Nombre', weight: 0.4, value: ns, detail: f.nombre ? `${Math.round(ns * 100)}% — “${f.nombre}” vs “${p.fullName}”` : 'no disponible en el documento' });

  let dob = 0, dobD = 'no disponible';
  if (f.fechaNac && p.dateOfBirth) { dob = f.fechaNac === p.dateOfBirth ? 1 : 0; dobD = dob ? '100% — coincide' : `0% — documento ${f.fechaNac} vs registro ${p.dateOfBirth}`; }
  factors.push({ key: 'fechaNac', label: 'Fecha de nacimiento', weight: 0.25, value: dob, detail: dobD });

  let ph = 0, phD = 'no disponible';
  const a = digits(f.telefono).slice(-10), b = digits(p.phone).slice(-10);
  if (a && b) { if (a === b) { ph = 1; phD = '100% — coincide completo'; } else if (a.slice(-4) === b.slice(-4)) { ph = 0.5; phD = 'parcial — últimos 4 dígitos coinciden'; } else phD = '0% — distinto'; }
  else if (!b) phD = 'la paciente no tiene teléfono registrado';
  factors.push({ key: 'telefono', label: 'Teléfono', weight: 0.15, value: ph, detail: phD });

  let mu = 0, muD = 'no disponible';
  if (f.municipio && p.municipality) { mu = norm(f.municipio) === norm(p.municipality) ? 1 : 0; muD = mu ? '100%' : `0% — “${f.municipio}” vs “${p.municipality}”`; }
  factors.push({ key: 'municipio', label: 'Municipio', weight: 0.1, value: mu, detail: muD });

  let fo = 0, foD = 'no disponible';
  const visit = (p.visits || []).find((v: any) => f.folioMuestra && norm(v.sampleFolio) === norm(f.folioMuestra));
  if (visit) { fo = 1; foD = `100% — folio de muestra ${f.folioMuestra} registrado en la jornada`; }
  else if (f.fechaToma && (p.visits || []).some((v: any) => v.collectedAt === f.fechaToma)) { fo = 1; foD = `100% — fecha de toma ${f.fechaToma} coincide con una visita`; }
  else if (f.folioMuestra || f.fechaToma) foD = '0% — no coincide con visitas registradas';
  factors.push({ key: 'folio', label: 'Folio de muestra / fecha de toma', weight: 0.1, value: fo, detail: foD });

  const score = Math.round(factors.reduce((s, x) => s + x.value * x.weight, 0) * 100);
  return { patientId: p.id, fullName: p.fullName, internalCode: p.internalCode, score, factors, nameSim: ns };
}

/** Devuelve candidatas ordenadas + nivel de riesgo. Si dos candidatas están cerca (homónimas), el riesgo sube aunque el puntaje sea alto. */
export function suggest(fields: any, patients: any[], n = 3) {
  const all = patients.filter((p) => p.status !== 'inactive').map((p) => scoreCandidate(fields, p))
    .filter((c) => c.score >= 35 || c.nameSim >= 0.85).sort((a, b) => b.score - a.score).slice(0, n);
  const top = all[0], second = all[1];
  let risk: 'bajo' | 'medio' | 'alto' = 'alto';
  const notes: string[] = [];
  if (top) {
    if (top.score >= 85) risk = 'bajo'; else if (top.score >= 65) risk = 'medio';
    if (second && top.score - second.score < 15 && second.nameSim >= 0.85) { risk = 'alto'; notes.push(`Posible homónima: ${second.fullName} (${second.score}%). Verificar con fecha de nacimiento y folio.`); }
    if (top.factors[0].value < 0.85) notes.push('Nombre divergente entre documento y registro.');
  } else notes.push('Ninguna paciente registrada coincide. Registrar o buscar manualmente.');
  return { candidates: all, risk, notes };
}

export function explain(c: ReturnType<typeof scoreCandidate>) {
  return c.factors.map((f) => `${f.label}: ${f.detail}`).concat(`Puntaje final: ${c.score}%`);
}
