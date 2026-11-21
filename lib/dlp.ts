// Guardia de salida (DLP clínico): ningún mensaje hacia la paciente puede contener
// diagnóstico, hallazgos, interpretación ni términos que lo insinúen. Se aplica a TODA
// notificación (plantillas y textos libres) antes de enviarla por cualquier canal.
const RULES: [RegExp, string][] = [
  [/\bnegativ[oa]s?\b/i, 'negativo'], [/\bpositiv[oa]s?\b/i, 'positivo'], [/\b(a?normal(es|idad(es)?)?)\b/i, 'normal/anormal'],
  [/\balterad[oa]s?\b|\balteraci[oó]n/i, 'alterado'], [/\bsospech|\bsuspect/i, 'sospecha'], [/\bc[aá]ncer|\bcancer[ií]gen/i, 'cáncer'],
  [/\b(NIC|CIN|LSIL|HSIL|ASC-?US|ASC-?H|AGC|LIEBG|LIEAG)\b/i, 'categoría citológica'], [/\bVPH\b|\bHPV\b|papiloma/i, 'VPH'],
  [/\blesi[oó]n(es)?\b/i, 'lesión'], [/\bdisplasia/i, 'displasia'], [/\bmalign|\bbenign/i, 'maligno/benigno'],
  [/\binflamaci[oó]n|\binflamatori/i, 'inflamación'], [/\bdiagn[oó]stic/i, 'diagnóstico'], [/\bhallazgo/i, 'hallazgo'],
  [/\bc[eé]lulas?\b/i, 'células'], [/\bbethesda\b/i, 'Bethesda'], [/\binfecci[oó]n/i, 'infección'], [/\btumor/i, 'tumor'],
  [/\bbiopsia/i, 'biopsia'], [/\bcolposcop/i, 'colposcopía'], [/\burgente|\bgrave\b|\bpreocupante/i, 'urgencia'],
  [/\btratamiento|\bmedicamento/i, 'recomendación clínica'], [/https?:\/\/\S+\.pdf\b/i, 'enlace directo a PDF'],
];
export function dlpCheck(text: string) {
  const hits: string[] = [];
  for (const [re, label] of RULES) if (re.test(String(text || ''))) hits.push(label);
  return { ok: hits.length === 0, hits: [...new Set(hits)] };
}
export const TEMPLATES = {
  aviso: 'LUMEN: hay un documento disponible en tu portal seguro. Accede con el código enviado por SMS. Este aviso no contiene resultados médicos.',
  otp: (code: string, min: number) => `LUMEN: tu código de seguridad es ${code}. Vence en ${min} minutos. No lo compartas con nadie. EIRA nunca te lo pedirá por teléfono.`,
  recordatorio: 'LUMEN: tienes un documento pendiente de consultar en tu portal seguro. Si necesitas ayuda, EIRA puede atenderte. Este aviso no contiene resultados médicos.',
};
