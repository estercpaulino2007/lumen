// Base de conocimiento de Luminy: cómo usar cada parte de LUMEN (ES/EN). Determinista y explicable.
export type KB = { id: string; k: string[]; es: string; en: string; links?: { label: string; href: string }[]; roles?: string[] };
export const KB: KB[] = [
  { id: 'add_user', k: ['agregar usuario', 'anadir usuario', 'crear usuario', 'nuevo usuario', 'cadastrar usuario', 'adicionar usuario', 'add user', 'create user', 'new user', 'invite user', 'nueva cuenta', 'crear cuenta', 'new account'],
    es: 'Para agregar un usuario: menú **Usuarios y accesos** → tarjeta **Agregar usuario** → nombre, correo y papel (Laboratorio, Captura, Profesional de salud o Administración; para Laboratorio elige también cuál) → **Crear**. LUMEN genera una contraseña temporal que se muestra una sola vez; compártela por un canal seguro. Solo la Administración puede hacerlo y queda en la auditoría.',
    en: 'To add a user: **Users & access** → **Add user** card → name, email and role (Laboratory, Intake, Health professional or Administration; for Laboratory also pick which lab) → **Create**. LUMEN generates a temporary password shown only once; share it through a secure channel. Only Administration can do this and it is audited.', links: [{ label: 'Usuarios y accesos', href: '/admin' }] },
  { id: 'deactivate_user', k: ['desactivar', 'bloquear usuario', 'quitar acceso', 'deactivate', 'disable user', 'remove user'],
    es: 'En **Usuarios y accesos** pulsa **Desactivar** junto al usuario. Sus sesiones se cierran al instante y no puede volver a entrar. Puedes reactivarlo después. No puedes desactivar tu propia cuenta.',
    en: 'In **Users & access**, click **Deactivate** next to the user. Their sessions end immediately and they can no longer sign in. You can reactivate them later. You cannot deactivate your own account.', links: [{ label: 'Usuarios y accesos', href: '/admin' }] },
  { id: 'revoke', k: ['revocar', 'revocar enlace', 'cerrar sesion de', 'revoke', 'kill session', 'link'],
    es: 'En **Usuarios y accesos** verás **Sesiones activas** y **Enlaces firmados**. Pulsa **Revocar** para invalidarlos al instante (por ejemplo, si una paciente perdió su celular). Queda auditado.',
    en: 'In **Users & access** you will find **Active sessions** and **Signed links**. Click **Revoke** to invalidate them instantly (e.g., if a patient lost her phone). It is audited.', links: [{ label: 'Usuarios y accesos', href: '/admin' }] },
  { id: 'upload', k: ['subir pdf', 'subo pdf', 'cargar pdf', 'cargar resultado', 'upload', 'send pdf'],
    es: 'Entra como **Laboratorio** → **Cargar resultados** → arrastra el PDF o pulsa **Elegir archivo**. LUMEN valida que sea PDF (máx. 10 MB), calcula su SHA-256, rechaza duplicados, lo cifra y lo pone en la fila de revisión. Hay 6 PDFs sintéticos de ejemplo en esa misma pantalla.',
    en: 'Sign in as **Laboratory** → **Upload results** → drag the PDF or click **Choose file**. LUMEN checks it is a PDF (max 10 MB), computes its SHA-256, rejects duplicates, encrypts it and queues it for review. There are 6 synthetic sample PDFs on that screen.', links: [{ label: 'Cargar resultados', href: '/laboratorio' }] },
  { id: 'confirm', k: ['confirmar asociacion', 'asociar', 'confirmar paciente', 'confirm match', 'match patient', 'associate'],
    es: 'En **Resultados** abre el documento: verás los campos leídos, los problemas de calidad y el puntaje explicable (40 % nombre, 25 % fecha de nacimiento, 15 % teléfono, 10 % municipio, 10 % folio o fecha de toma). Elige la candidata y pulsa **Confirmar asociación**, o **Revisar manualmente**, **Rechazar** o **Solicitar corrección al laboratorio**. Si la calidad es mala, la nota es obligatoria.',
    en: 'In **Results**, open the document: you will see the extracted fields, quality issues and the explainable score (40% name, 25% DOB, 15% phone, 10% municipality, 10% sample ID or collection date). Pick the candidate and click **Confirm match**, or **Review manually**, **Reject** or **Request correction from the lab**. A note is required for poor-quality documents.', links: [{ label: 'Resultados', href: '/resultados' }] },
  { id: 'authorize', k: ['autorizar', 'autorizacion clinica', 'liberar', 'authorize', 'release', 'approve result', 'bloquear entrega', 'devolver'],
    es: 'Solo la **Profesional de salud** autoriza. En **Autorización clínica** abre el resultado, elige o escribe el motivo, confirma tu contraseña y pulsa **Autorizar entrega** (o **Devolver** / **Bloquear**). Por doble control, quien confirmó la asociación no puede autorizar. Al autorizar se envía el aviso neutro.',
    en: 'Only the **Health professional** authorizes. In **Clinical authorization**, open the result, choose or write the reason, confirm your password and click **Authorize delivery** (or **Return** / **Block**). With two-person control, whoever confirmed the match cannot authorize. Authorizing sends the neutral notice.', links: [{ label: 'Autorización clínica', href: '/resultados?stage=clinical' }] },
  { id: 'whatsapp', k: ['whatsapp', 'canal', 'canales', 'failover', 'sms', 'correo', 'channel', 'channels', 'notification center', 'central'],
    es: 'En **Notificaciones** puedes encender o apagar cada canal (SMS, correo, WhatsApp Business, atención asistida). Varias pacientes prefieren WhatsApp; con WhatsApp caído el aviso conmuta solo al siguiente canal y lo verás como "whatsapp falló → conmutado". Enciende WhatsApp y envía un recordatorio desde el resultado para ver la entrega por WhatsApp. Todos los proveedores son simulados.',
    en: 'In **Notifications** you can switch each channel on or off (SMS, email, WhatsApp Business, assisted service). Several patients prefer WhatsApp; with WhatsApp down the notice automatically fails over to the next channel, shown as "whatsapp failed → switched". Turn WhatsApp on and send a reminder from the result to see delivery via WhatsApp. All providers are simulated.', links: [{ label: 'Notificaciones', href: '/notificaciones' }] },
  { id: 'dlp', k: ['guardia', 'dlp', 'mensaje clinico', 'anormal', 'guard', 'blocked message'],
    es: 'La guardia clínica (DLP) revisa todo aviso antes de salir: bloquea palabras como "anormal", "VPH", "lesión" o "cáncer". Pruébala en **Notificaciones → Guardia clínica de mensajes**.',
    en: 'The clinical guard (DLP) checks every notice before it leaves: it blocks words like "abnormal", "HPV", "lesion" or "cancer". Try it in **Notifications → Clinical message guard**.', links: [{ label: 'Notificaciones', href: '/notificaciones' }] },
  { id: 'patient_login', k: ['paciente entrar', 'portal', 'otp', 'codigo', 'patient login', 'sign in patient', 'patient portal', 'code'],
    es: 'Portada → **Soy paciente** → elige **María López** → **Recibir código**. Como el SMS es simulado, en modo demo el código aparece en pantalla (**Usar código**). Luego la verificación de presencia por cámara (opcional) y **Ver** / **Descargar**. El enlace dura 5 minutos y solo funciona en esa sesión.',
    en: 'Home → **I\'m a patient** → choose **María López** → **Get code**. Since SMS is simulated, in demo mode the code is shown on screen (**Use code**). Then the optional camera presence check and **View** / **Download**. The link lasts 5 minutes and only works in that session.', links: [{ label: 'Portal', href: '/portal' }] },
  { id: 'camera', k: ['camara', 'rostro', 'face', 'camera', 'liveness', 'presencia'],
    es: 'Tras el código, la paciente puede usar la **Verificación de presencia**: pide permiso, detecta el rostro y un reto (parpadear o girar la cabeza) con face-api.js **en el dispositivo**; la imagen nunca se envía. Siempre puede continuar sin cámara. No analiza el examen ni decide nada.',
    en: 'After the code, the patient can use the **Presence check**: it asks for permission, detects the face and a challenge (blink or turn the head) with face-api.js **on the device**; the image is never sent. She can always continue without the camera. It does not analyze the test or decide anything.' },
  { id: 'assisted', k: ['codigo asistido', 'sin celular', 'sin internet', 'assisted', 'no phone', 'ticket'],
    es: 'En **Pacientes** pulsa **Código asistido** junto a la paciente: se genera un código de un solo uso válido 24 h para imprimir. La paciente lo usa en el portal con su fecha de nacimiento, acompañada por personal de EIRA.',
    en: 'In **Patients**, click **Assisted code** next to the patient: a single-use code valid for 24 h is generated for printing. The patient uses it in the portal with her date of birth, accompanied by EIRA staff.', links: [{ label: 'Pacientes', href: '/pacientes' }] },
  { id: 'register_patient', k: ['registrar paciente', 'nueva paciente', 'alta paciente', 'register patient', 'new patient', 'add patient'],
    es: 'En **Pacientes** usa **Registrar paciente**: nombre, fecha de nacimiento, municipio, teléfono o correo, CURP opcional (se valida el dígito verificador) y el consentimiento por canal.',
    en: 'In **Patients**, use **Register patient**: name, date of birth, municipality, phone or email, optional CURP (check digit validated) and per-channel consent.', links: [{ label: 'Pacientes', href: '/pacientes' }] },
  { id: 'offline', k: ['offline', 'sin conexion', 'brigada', 'conflicto', 'sincroniz', 'sync', 'conflict'],
    es: 'En **Brigada offline**: pulsa el botón de conexión para simular que no hay red, registra una paciente o edita un teléfono, pulsa **Simular edición desde otra brigada** y vuelve a conectar. Aparece el conflicto y una persona elige qué valor queda. Todo se audita.',
    en: 'In **Offline brigade**: click the connection button to simulate no network, register a patient or edit a phone, click **Simulate an edit from another brigade** and reconnect. The conflict appears and a person chooses which value stays. Everything is audited.', links: [{ label: 'Brigada offline', href: '/brigada' }] },
  { id: 'export', k: ['exportar', 'reporte', 'informe', 'csv', 'json', 'export', 'report', 'donantes'],
    es: 'En **Reportes** descarga el informe **anonimizado** (seudónimos, rango de edad, tiempos por etapa) en CSV o JSON, o una exportación **identificada** de registros seleccionados con motivo obligatorio. Nunca incluye contenido clínico.',
    en: 'In **Reports**, download the **anonymized** report (pseudonyms, age range, per-stage times) as CSV or JSON, or an **identified** export of selected records with a mandatory reason. It never includes clinical content.', links: [{ label: 'Reportes', href: '/exportar' }] },
  { id: 'audit', k: ['auditoria', 'bitacora', 'log', 'audit', 'hash', 'integridad'],
    es: 'En **Auditoría** filtras por papel, acción, resultado, paciente y fecha. Cada evento guarda el hash del anterior: si alguien borra o edita una línea, el panel muestra la alteración.',
    en: 'In **Audit** you filter by role, action, result, patient and date. Each event stores the previous event\'s hash: if someone deletes or edits a line, the dashboard flags the tampering.', links: [{ label: 'Auditoría', href: '/auditoria' }] },
  { id: 'followup', k: ['seguimiento', 'no abrio', 'contactar', 'follow', 'follow-up', 'followup'],
    es: 'En **Seguimiento** están las pacientes que no abrieron su documento en 48 h, las que necesitan entrega asistida y las que la profesional pidió contactar. Registra cada contacto (no contestó, cita agendada, entrega presencial).',
    en: 'In **Follow-up** you will find patients who did not open their document within 48 h, those who need assisted delivery and those the professional asked to contact. Log each contact (no answer, appointment booked, in-person delivery).', links: [{ label: 'Seguimiento', href: '/seguimiento' }] },
  { id: 'privacy', k: ['privacidad', 'retencion', 'consentimiento', 'privacy', 'retention', 'consent', 'politica'],
    es: 'En **Privacidad** la Administración ajusta la duración de enlaces, usos máximos, retención de PDFs y la alerta de 48 h, y se ve el consentimiento por canal de cada paciente.',
    en: 'In **Privacy**, Administration sets link duration, max uses, PDF retention and the 48-h alert, and you can see each patient\'s per-channel consent.', links: [{ label: 'Privacidad', href: '/privacidad' }] },
  { id: 'language', k: ['idioma', 'ingles', 'espanol', 'language', 'english', 'spanish', 'traducir'],
    es: 'Usa el selector **ES | EN** de la barra superior (también en la portada y el portal).', en: 'Use the **ES | EN** switch in the top bar (also on the home page and the portal).' },
  { id: 'a11y', k: ['zoom', 'letra', 'contraste', 'accesib', 'font', 'text size', 'contrast', 'accessib'],
    es: 'Abajo a la izquierda está la barra de accesibilidad: **−/+** cambia el tamaño de letra y el ícono de contraste activa el alto contraste. El portal tiene **Escuchar instrucciones** con voz.',
    en: 'The accessibility bar is at the bottom left: **−/+** changes the text size and the contrast icon turns on high contrast. The portal has **Listen to instructions** with voice.' },
  { id: 'demo_data', k: ['cargar datos', 'datos demo', 'reiniciar demo', 'demo data', 'reset demo', 'seed'],
    es: 'En la portada pulsa **Cargar datos de demostración**: recrea 10 pacientes, 3 laboratorios y 12 resultados ficticios en todas las etapas. En Render gratuito hay que hacerlo de nuevo tras cada reinicio.',
    en: 'On the home page click **Load demo data**: it recreates 10 patients, 3 labs and 12 fictitious results at every stage. On Render\'s free plan you need to do it again after each restart.' },
  { id: 'what', k: ['que es lumen', 'lumen', 'what is', 'como funciona', 'how does it work', 'flujo', 'flow'],
    es: 'LUMEN entrega resultados de Papanicolaou de forma segura: laboratorio sube PDF → lectura de identificadores → puntaje explicable → confirmación humana → autorización clínica de otra persona → aviso neutro multicanal → OTP → enlace de 5 min con marca de agua → seguimiento a 48 h → bitácora encadenada.',
    en: 'LUMEN delivers Pap smear results securely: lab uploads PDF → identifier reading → explainable score → human confirmation → clinical authorization by another person → neutral multichannel notice → OTP → 5-min watermarked link → 48-h follow-up → chained audit log.' },
  { id: 'stats', k: ['estadistica', 'cuantas mujeres', 'mortalidad', 'inegi', 'globocan', 'statistics', 'mortality', 'how many women'],
    es: 'Datos públicos: según INEGI (Estadísticas de Defunciones Registradas 2024), 4,646 mujeres fallecieron por cáncer cervicouterino en México en 2024; GLOBOCAN estimó 11,919 casos nuevos ese año, el segundo cáncer más diagnosticado en mujeres. Para datos más recientes activa la IA con búsqueda web.',
    en: 'Public data: according to INEGI (Registered Death Statistics 2024), 4,646 women died of cervical cancer in Mexico in 2024; GLOBOCAN estimated 11,919 new cases that year, the second most diagnosed cancer in women. For newer data, enable the AI with web search.' },
  { id: 'luminy', k: ['quien eres', 'que puedes', 'luminy', 'who are you', 'what can you do', 'help', 'ayuda'],
    es: 'Soy Luminy. Explico cómo usar cada pantalla, resumo la fila con datos en vivo, explico puntajes, reviso canales, seguimientos y la bitácora. Con una clave de IA configurada también respondo preguntas generales y busco en la web. Nunca interpreto resultados clínicos.',
    en: "I'm Luminy. I explain how to use every screen, summarize the queue with live data, explain scores, and check channels, follow-ups and the audit log. With an AI key configured I also answer general questions and search the web. I never interpret clinical results." },
];

const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ');
const STOP = new Set(['de', 'la', 'el', 'un', 'una', 'a', 'the', 'an', 'to', 'of', 'en', 'in', 'mi', 'my', 'y', 'and', 'o', 'or', 'como', 'how', 'que', 'what']);
// Coincidencia por raíz: "agrego"/"agregar", "usuario"/"usuarios", "adding"/"add" (tolerante a conjugaciones y plurales).
const stem = (w: string) => (w.length > 5 ? w.slice(0, w.length - 2) : w.length > 3 ? w.slice(0, w.length - 1) : w);
const WEAK = new Set(['what', 'luminy', 'stats']);
export function kbSearch(q: string) {
  const toks = n(q).split(/\s+/).filter(Boolean);
  const hit = (w: string) => toks.some((t) => t === w || (w.length > 3 && t.length > 3 && (t.startsWith(stem(w)) || w.startsWith(stem(t)))));
  let best: KB | null = null, score = 0;
  for (const e of KB) {
    let sc = 0;
    for (const k of e.k) { const ws = n(k).split(/\s+/).filter((w) => w && !STOP.has(w)); if (ws.length && ws.every(hit)) sc = Math.max(sc, ws.join('').length * (ws.length > 1 ? 1.5 : 1)); }
    if (WEAK.has(e.id)) sc *= 0.5;
    if (sc > score) { score = sc; best = e; }
  }
  return score >= 4 ? best : null;
}
