import { z } from 'zod';
import { api, body, json, HttpError } from '@/lib/http';
import { getSession } from '@/lib/auth';
import { luminy, requestContact, CHIPS } from '@/lib/luminy';
import { rateLimited } from '@/lib/kv';
import { askLLM, llmInfo } from '@/lib/llm';
import { audit } from '@/lib/audit';

export const GET = api(async (req) => { const s = getSession(req); const i = llmInfo(); return json({ chips: s && s.role !== 'paciente' ? CHIPS.staff : CHIPS.patient, ai: i ? `IA generativa (${i.model}) + reglas` : 'Motor de reglas (sin IA externa)' }); });
export const POST = api(async (req) => {
  const s = getSession(req);
  const b = await body(req, z.object({ message: z.string().max(400).optional(), action: z.enum(['request_contact']).optional(), resultId: z.string().max(40).optional(), lang: z.enum(['es', 'en']).optional() }));
  if (await rateLimited('luminy:' + (s?.session.id || 'anon'), 60, 600)) throw new HttpError(429, 'Demasiadas preguntas seguidas.');
  if (b.action === 'request_contact') {
    if (!s || s.role !== 'paciente') throw new HttpError(401, 'Necesitas tu sesión segura.');
    requestContact(s.patient.id);
    return json({ text: 'Listo. Pedí a EIRA que una profesional de salud te contacte por tu canal preferido. No compartimos tu pregunta con nadie más.', source: 'Seguimiento' });
  }
  const role = s?.role || 'paciente';
  const rule = luminy(b.message || '', { role, userId: s?.user?.id, patientId: s?.patient?.id, resultId: b.resultId, lang: b.lang });
  // Las respuestas con datos exactos (puntajes, bitácora) o con límite clínico NO pasan por la IA generativa.
  if (rule.guardrail || rule.source.startsWith('Resultado') || rule.source.startsWith('Verificación')) return json(rule);
  const ai = await askLLM(b.message || '', role, rule.fallback ? '(sin respuesta en la base de conocimiento; responde con tu conocimiento general o búsqueda web si es necesario)' : rule.text, b.lang);
  if (!ai) return json(rule);
  audit({ actorRole: role, actorId: s?.user?.id || s?.patient?.id || 'anonimo', action: 'luminy.respuesta_ia', entityType: 'Assistant', entityId: 'luminy', after: { model: ai.model } });
  return json({ ...rule, text: ai.text, source: `Luminy IA · ${ai.model} · datos agregados + guardia clínica` });
});
