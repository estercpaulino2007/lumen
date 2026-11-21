import { readDB } from './store';
import { stageOf } from './views';
import { dlpCheck } from './dlp';

// Capa de IA generativa OPCIONAL para Luminy. Sin clave configurada, Luminy usa solo reglas.
// Proveedores: Anthropic (ANTHROPIC_API_KEY) o cualquier API compatible con OpenAI (LUMINY_API_KEY + LUMINY_BASE_URL).
// Minimización: al modelo se le envían solo conteos y estados agregados. Nunca nombres, contactos, CURP ni PDFs.
// Toda respuesta pasa por la guardia DLP; si menciona contenido clínico se descarta y se usa la respuesta por reglas.
export const llmInfo = () => {
  if (process.env.ANTHROPIC_API_KEY) return { provider: 'anthropic', model: process.env.LUMINY_MODEL || 'claude-haiku-5-5' };
  if (process.env.LUMINY_API_KEY) return { provider: 'openai-compatible', model: process.env.LUMINY_MODEL || 'gpt-4o-mini' };
  return null;
};

const SYSTEM = (role: string) => `Eres Luminy, la asistente de LUMEN, plataforma de EIRA Movimiento Rosa A.C. (México) para entregar de forma segura resultados de Papanicolaou.
Respondes en español de México, claro, cálido y breve (máximo 120 palabras). Lenguaje simple.
REGLAS ABSOLUTAS: nunca diagnosticas, nunca interpretas resultados, nunca dices si algo es normal o anormal, nunca mencionas hallazgos, enfermedades, VPH, lesiones ni gravedad, nunca recomiendas tratamientos ni decides liberar resultados. Si te lo piden, explica con amabilidad que solo una profesional de salud de EIRA puede hacerlo.
Para datos de LUMEN usa solo el CONTEXTO y la RESPUESTA DE REFERENCIA. Para preguntas generales (salud pública, tecnología, normas, noticias, uso de herramientas) puedes usar tu conocimiento y la herramienta de búsqueda web si está disponible; menciona brevemente la fuente. Si no sabes algo, dilo.
${role === 'paciente'
    ? 'Hablas con una PACIENTE. Ayúdala a usar el portal (código de 6 dígitos por SMS o correo que vence en 5 min, 5 intentos, enlace seguro de 5 min, código asistido si no tiene celular), explica la privacidad y, en términos generales, qué es el Papanicolaou (estudio de detección: se toma una muestra del cuello del útero para revisarla en laboratorio).'
    : 'Hablas con PERSONAL de EIRA (' + role + '). Ayudas a priorizar la fila, explicar el flujo (revisión administrativa → autorización clínica por otra persona → aviso neutro → OTP → enlace firmado), los canales con conmutación automática, el seguimiento a 48 h y la bitácora encadenada.'}`;

function context(role: string) {
  if (role === 'paciente') return 'Portal de paciente. Datos personales no disponibles para la asistente.';
  const db = readDB();
  const st = (s: string) => db.results.filter((r) => stageOf(r) === s).length;
  return JSON.stringify({
    enRevision: st('review'), riesgoAltoOMalaCalidad: db.results.filter((r) => stageOf(r) === 'review' && (r.risk === 'alto' || r.quality === 'mala')).length,
    esperandoAutorizacionClinica: st('clinical'), autorizados: st('delivery'),
    sinAbrir48h: db.results.filter((r) => r.deliveryStatus === 'notified').length,
    seguimientosAbiertos: db.followUps.filter((f) => f.status === 'open').length,
    canales: db.settings.channels, laboratorios: db.labs.length,
  });
}

export async function askLLM(message: string, role: string, ruleHint: string, lang: 'es' | 'en' = 'es'): Promise<{ text: string; model: string } | null> {
  const info = llmInfo(); if (!info) return null;
  const user = `CONTEXTO (datos en vivo, agregados): ${context(role)}\nRESPUESTA DE REFERENCIA DEL MOTOR DE REGLAS (puedes reformularla o ampliarla sin contradecirla): ${ruleHint}\n\nPREGUNTA: ${message}`;
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 25000);
  try {
    let text = '';
    if (info.provider === 'anthropic') {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: ctrl.signal, headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: info.model, max_tokens: 700, ...(process.env.LUMINY_WEB_SEARCH === 'false' ? {} : { tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }] }), system: SYSTEM(role) + (lang === 'en' ? '\nANSWER IN ENGLISH.' : ''), messages: [{ role: 'user', content: user }] }) });
      if (!r.ok) throw new Error('LLM ' + r.status);
      text = (await r.json()).content?.filter((c: any) => c.type === 'text').map((c: any) => c.text || '').join('') || '';
    } else {
      const base = (process.env.LUMINY_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
      const r = await fetch(base + '/chat/completions', { method: 'POST', signal: ctrl.signal, headers: { authorization: 'Bearer ' + process.env.LUMINY_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ model: info.model, max_tokens: 400, temperature: 0.3, messages: [{ role: 'system', content: SYSTEM(role) + (lang === 'en' ? '\nANSWER IN ENGLISH.' : '') }, { role: 'user', content: user }] }) });
      if (!r.ok) throw new Error('LLM ' + r.status);
      text = (await r.json()).choices?.[0]?.message?.content || '';
    }
    text = text.trim();
    if (!text || !dlpCheck(text).ok) return null; // la guardia clínica también vigila a la IA
    return { text, model: info.model };
  } catch (e: any) { console.warn('[luminy] IA no disponible, uso reglas:', e?.message); return null; }
  finally { clearTimeout(to); }
}
