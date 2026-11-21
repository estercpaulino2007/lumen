import { readDB, mutate, nowISO } from './store';
import { stageOf } from './views';
import { verifyChain, audit } from './audit';
import { dlpCheck, TEMPLATES } from './dlp';
import { followUpSweep } from './flow';
import { newId } from './crypto';
import { kbSearch } from './luminy-kb';

// LUMINY — asistente de LUMEN. Motor de reglas determinista y explicable sobre datos operativos.
// Límite duro: no diagnostica, no interpreta resultados, no clasifica gravedad y no decide liberaciones.
// No tiene acceso al contenido clínico de los PDFs (solo a estados, conteos e identificadores).
export type Reply = { fallback?: boolean; text: string; links?: { label: string; href: string }[]; actions?: { label: string; action: string }[]; chips?: string[]; guardrail?: boolean; source: string };

const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const has = (t: string, ...w: string[]) => w.some((x) => t.includes(x));
const CLINICAL = ['diagnost', 'interpret', 'que significa mi', 'significa mi', 'anormal', 'abnormal', 'positivo', 'negativo', 'positive', 'negative', 'vph', 'hpv', 'lesion', 'grave', 'peligro', 'tengo algo', 'estoy enferma', 'salio mal', 'salio bien', 'que tengo', 'tratamiento', 'treatment', 'displasia', 'dysplasia', 'my result mean', 'is it normal', 'es normal', 'do i have'];
const STAFF_CHIPS = ['¿Qué hay pendiente hoy?', 'Explica el puntaje de este resultado', '¿Cómo están los canales?', 'Seguimientos abiertos', '¿La bitácora está íntegra?', 'Redacta un recordatorio'];
const PATIENT_CHIPS = ['¿Qué es el Papanicolaou?', 'No me llegó el código', '¿Quién puede ver mi documento?', '¿Qué significa mi resultado?', 'No tengo celular'];

export function luminy(message: string, ctx: { role: string; userId?: string; patientId?: string; resultId?: string; lang?: 'es' | 'en' }): Reply {
  const t = n(message);
  const en = ctx.lang === 'en';
  const staff = ctx.role !== 'paciente';
  const actor = { actorRole: ctx.role, actorId: ctx.userId || ctx.patientId || 'anonimo' };

  if (CLINICAL.some((w) => t.includes(w)) && !has(t, 'puntaje', 'score', 'redact', 'mensaje', 'aviso', 'recordatorio')) {
    audit({ ...actor, action: 'luminy.limite_clinico', entityType: 'Assistant', entityId: 'luminy', after: { role: ctx.role } });
    return staff
      ? { guardrail: true, source: 'Regla de seguridad', text: 'No interpreto resultados ni sugiero diagnósticos: esa decisión es exclusiva de la profesional de salud. Puedo ayudarte con el estado del flujo, la calidad del documento o la asociación de la paciente.', chips: STAFF_CHIPS.slice(0, 3) }
      : { guardrail: true, source: 'Regla de seguridad', text: 'No puedo interpretar tu documento: solo una profesional de salud puede explicártelo. Si quieres, pido a EIRA que una profesional te contacte para acompañarte. Tu pregunta no se comparte con nadie más.', actions: ctx.patientId ? [{ label: 'Quiero que una profesional me contacte', action: 'request_contact' }] : [], chips: PATIENT_CHIPS.slice(0, 3) };
  }

  const howTo = has(t, 'como', 'cómo', 'how', 'donde', 'where', 'puedo', 'can i', 'quiero', 'want', 'agregar', 'add', 'crear', 'create');
  const kb = kbSearch(message);
  if (kb && (howTo || !staff || !has(t, 'pendiente', 'pending', 'hoy', 'today', 'resumen', 'summary'))) {
    if (!(staff === false && ['add_user', 'deactivate_user', 'revoke', 'upload', 'confirm', 'authorize', 'offline', 'export', 'audit', 'privacy', 'register_patient'].includes(kb.id)))
      return { source: en ? 'LUMEN knowledge base' : 'Base de conocimiento de LUMEN', text: (en ? kb.en : kb.es).replace(/\*\*/g, ''), links: kb.links };
  }
  if (!staff) {
    if (has(t, 'que es', 'papanicolaou', 'como se toma', 'para que sirve'))
      return { source: 'Información general (no personalizada)', text: 'El Papanicolaou es un estudio de detección: se toma una pequeña muestra del cuello del útero para que un laboratorio la revise. Sirve para encontrar cambios a tiempo, antes de que causen molestias. Hacerlo de forma periódica es una de las mejores formas de cuidarte. Tu documento es del laboratorio y una profesional de EIRA lo revisó antes de ponerlo a tu disposición.', chips: ['¿Quién puede ver mi documento?', 'No me llegó el código'] };
    if (has(t, 'codigo', 'no llego', 'sms', 'otp'))
      return { source: 'Ayuda del portal', text: 'El código llega por SMS o correo y vence en 5 minutos. Si no llega: revisa que el número sea el que diste en tu jornada, espera un minuto y pide otro. Después de 5 intentos el acceso se pausa 15 minutos para protegerte. Si sigues sin recibirlo, EIRA puede darte un código asistido.', chips: ['No tengo celular'] };
    if (has(t, 'quien', 'privacidad', 'ver mi', 'seguro', 'datos'))
      return { source: 'Política de privacidad de LUMEN', text: 'Solo tú y el personal autorizado de EIRA pueden abrir tu documento, y cada acceso queda registrado. El aviso que recibes nunca incluye información médica. El enlace para abrir el PDF dura 5 minutos y solo funciona en tu sesión.' };
    if (has(t, 'celular', 'telefono', 'internet', 'asistid'))
      return { source: 'Ayuda del portal', text: 'No hay problema: EIRA puede imprimirte un código asistido de un solo uso. Lo usas con tu fecha de nacimiento, acompañada por personal de EIRA. También puedes pedir atención presencial.', links: [{ label: 'Ir a acceso asistido', href: '/portal' }] };
    return { source: 'Luminy', fallback: true, text: en ? "Hi, I'm Luminy. I help you use your secure portal. I don't interpret results, but I can connect you with an EIRA professional." : 'Hola, soy Luminy. Te ayudo a usar tu portal seguro. No interpreto resultados, pero puedo conectarte con una profesional de EIRA.', chips: PATIENT_CHIPS };
  }

  const db = readDB();
  if (ctx.resultId && has(t, 'puntaje', 'score', 'explica', 'por que', 'asociacion', 'calidad')) {
    const r = db.results.find((x) => x.id === ctx.resultId);
    if (r) {
      const lines = r.associationExplanation?.lines || [];
      const q = (r.qualityIssues || []).map((i: any) => '• ' + i.msg).join('\n');
      return { source: `Resultado ${r.id} · puntaje explicable`, text: `${lines.length ? lines.join('\n') : 'Este documento no tiene candidata sugerida.'}${r.associationExplanation?.notes?.length ? '\n\nAtención: ' + r.associationExplanation.notes.join(' ') : ''}${q ? '\n\nCalidad del documento:\n' + q : ''}\n\nRiesgo de asociación: ${r.risk || '—'}. La decisión final es tuya: nunca asocio automáticamente.` };
    }
  }
  if (has(t, 'pendiente', 'hoy', 'resumen', 'urgente', 'que hago', 'prioridad', 'pending', 'today', 'summary', 'priority', 'what should i')) {
    followUpSweep(db);
    const rev = db.results.filter((r) => stageOf(r) === 'review'), cli = db.results.filter((r) => stageOf(r) === 'clinical');
    const hard = rev.filter((r) => r.risk === 'alto' || r.quality === 'mala');
    const fu = db.followUps.filter((f) => f.status === 'open');
    const name = (r: any) => db.patients.find((p) => p.id === r.patientId)?.fullName || r.ocrExtractedJson?.nombre || r.originalFileName;
    return {
      source: 'Datos en vivo de LUMEN',
      text: `Resumen operativo:\n• ${rev.length} documentos en revisión administrativa (${hard.length} con riesgo alto o mala calidad).\n• ${cli.length} esperando autorización clínica.\n• ${fu.length} seguimientos abiertos (${fu.filter((f) => f.priority === 'alta').length} de prioridad alta).\n${hard[0] ? `\nEmpezaría por: ${name(hard[0])} — ${(hard[0].qualityIssues?.[0]?.msg || hard[0].associationExplanation?.notes?.[0] || 'riesgo alto de asociación')}` : ''}`,
      links: [...hard.slice(0, 3).map((r) => ({ label: 'Revisar: ' + name(r), href: `/resultados/${r.id}` })), { label: 'Fila de revisión', href: '/resultados' }, { label: 'Seguimiento', href: '/seguimiento' }],
    };
  }
  if (has(t, 'como estan los canales', 'estado de los canales', 'how are the channels', 'channel status')) {
    const ch = db.settings.channels;
    const failovers = db.notifications.filter((x) => x.attempts?.some((a: any) => !a.ok)).length;
    return { source: 'Orquestador de canales', text: `Canales: SMS ${ch.sms ? 'operando' : 'caído'}, correo ${ch.email ? 'operando' : 'caído'}, WhatsApp ${ch.whatsapp ? 'operando' : 'bloqueado'}, asistida ${ch.assisted ? 'operando' : 'caída'}.\n${failovers} avisos se entregaron gracias a la conmutación automática. Ninguna entrega depende de un solo canal.`, links: [{ label: 'Central de Notificaciones', href: '/notificaciones' }] };
  }
  if (has(t, 'seguimientos abiertos', 'open follow', 'quien falta', 'who is missing')) {
    followUpSweep(db);
    const fu = db.followUps.filter((f) => f.status === 'open');
    return { source: 'Seguimiento', text: fu.length ? fu.map((f) => `• ${db.patients.find((p) => p.id === f.patientId)?.fullName}: ${{ no_acceso_48h: 'no consultó su documento en 48 h', entrega_asistida: 'requiere entrega asistida', contacto_indicado_por_profesional: 'contacto indicado por la profesional', paciente_solicita_orientacion: 'pidió orientación de una profesional' }[f.reason as string] || f.reason}`).join('\n') : 'No hay seguimientos abiertos.', links: [{ label: 'Abrir seguimiento', href: '/seguimiento' }] };
  }
  if (has(t, 'integr', 'manipul', 'intact', 'tamper')) {
    const v = verifyChain();
    return { source: 'Verificación criptográfica de la bitácora', text: v.ok ? `La bitácora está íntegra: ${v.count} eventos encadenados con SHA-256. Hash de cabeza ${String(v.head).slice(0, 16)}…` : `ALERTA: la cadena se rompe en el evento #${v.brokenAt}. ${v.reason}.`, links: [{ label: 'Ver auditoría', href: '/auditoria' }] };
  }
  if (has(t, 'redact', 'draft', 'recordatorio', 'reminder')) {
    const msg = TEMPLATES.recordatorio, g = dlpCheck(msg);
    return { source: 'Plantilla institucional + guardia DLP', text: `Propuesta de recordatorio (verificada por la guardia clínica: ${g.ok ? 'sin información clínica' : 'bloqueado'}):\n\n“${msg}”\n\nSe envía desde el detalle de un resultado autorizado con “Enviar recordatorio neutro”.` };
  }
  return { source: 'Luminy', fallback: true, text: en ? "I don't have an exact answer for that in LUMEN's knowledge base. Try asking how to do something (e.g. \"how do I add a user?\") or tap a suggestion. With an AI key configured I can also answer general questions and search the web." : 'No tengo una respuesta exacta para eso en la base de conocimiento de LUMEN. Prueba preguntando cómo hacer algo (p. ej. "¿cómo agrego un usuario?") o toca una sugerencia. Con una clave de IA configurada también respondo preguntas generales y busco en la web.', chips: STAFF_CHIPS };
}

export function requestContact(patientId: string) {
  const f = mutate((db) => {
    const ex = db.followUps.find((x) => x.patientId === patientId && x.reason === 'paciente_solicita_orientacion' && x.status === 'open');
    if (ex) return ex;
    const f = { id: newId('fu_'), patientId, resultId: null, reason: 'paciente_solicita_orientacion', priority: 'alta', dueAt: new Date(Date.now() + 48 * 3600_000).toISOString(), status: 'open', assignedTo: null, contactAttempts: 0, lastContactAt: null, notes: 'La paciente pidió desde el portal que una profesional la contacte para orientarla.', createdAt: nowISO(), updatedAt: nowISO() };
    db.followUps.push(f); return f;
  });
  audit({ actorRole: 'paciente', actorId: patientId, action: 'seguimiento.solicitado_por_paciente', entityType: 'FollowUpTask', entityId: f.id });
  return f;
}
export const CHIPS = { staff: STAFF_CHIPS, patient: PATIENT_CHIPS };
