import { PageHead, Section } from '@/components/ui';

const IMPL = [
  'Carga de PDF con validación de extensión, MIME, firma %PDF, tamaño, hash SHA-256 y rechazo de duplicados',
  'Cifrado AES-256-GCM de los PDFs en reposo (almacenamiento privado fuera de /public)',
  'Extracción de identificadores desde la capa de texto del PDF y controles de calidad (página ausente, PDF dañado, sin texto, fechas, duplicado)',
  'Validación real de CURP (estructura RENAPO + dígito verificador) y cruce con la fecha de nacimiento',
  'Puntaje de asociación explicable (40/25/15/10/10) con detección de homónimas',
  'Confirmación humana obligatoria, solicitud de corrección al laboratorio, doble control y reautenticación',
  'RBAC en el backend para 5 papeles; sesiones con cookie HttpOnly/SameSite, expiración e invalidación',
  'OTP de 6 dígitos con hash, 5 minutos, 5 intentos, bloqueo temporal y rate limiting',
  'Enlaces firmados de corta duración, con límite de usos, ligados a la sesión y revocables',
  'Marca de agua dinámica en cada visualización/descarga',
  'Guardia clínica (DLP) en todos los avisos y orquestador multicanal con failover',
  'Bitácora append-only encadenada con verificación de integridad',
  'Seguimiento automático (48 h), tareas por indicación profesional y entrega asistida',
  'Fila offline en IndexedDB con detección y resolución de conflictos por campo',
  'Exportación CSV/JSON anonimizada (seudónimos HMAC) o identificada con motivo',
  'Verificación de presencia por cámara con face-api.js en el dispositivo (parpadeo o giro)',
];
const SIM = [
  'Proveedores de SMS, correo y WhatsApp Business: los mensajes se muestran en la Central de Notificaciones',
  'Las caídas de canal se simulan con un interruptor',
  'OCR de imágenes escaneadas: el prototipo marca “requiere OCR”; Tesseract.js queda como siguiente paso',
  'La “otra brigada” del conflicto offline es un botón de simulación',
  'Si el modelo de cámara no carga (sin internet), hay una simulación rotulada',
  'Laboratorios, pacientes, CURP, teléfonos y PDFs son ficticios',
  'Integración con sistemas de laboratorio (HL7/FHIR) y cumplimiento normativo completo: roadmap de piloto',
];
export default function Acerca() {
  return (
    <>
      <PageHead title="Implementado vs. simulado" sub="Transparencia total sobre lo que funciona hoy y lo que requiere un piloto real." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Implementado y funcionando"><ul className="space-y-2 text-sm">{IMPL.map((t) => <li key={t} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-safe" />{t}</li>)}</ul></Section>
        <Section title="Simulado (claramente rotulado)"><ul className="space-y-2 text-sm">{SIM.map((t) => <li key={t} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />{t}</li>)}</ul></Section>
      </div>
      <div className="mt-6"><Section title="Luminy (asistente)"><p className="text-sm text-mute">Motor de reglas determinista sobre datos en vivo. Si se configura <code>ANTHROPIC_API_KEY</code> o <code>LUMINY_API_KEY</code>, una IA generativa reformula las respuestas recibiendo solo conteos agregados (nunca nombres, contactos ni PDFs). Las preguntas clínicas se bloquean antes de llegar a la IA, y toda respuesta de la IA pasa por la guardia DLP.</p></Section></div>
      <div className="mt-6"><Section title="Créditos 3D (Sketchfab)"><ul className="space-y-1 text-sm text-mute"><li>Torus — syncretize (CC BY 4.0)</li><li>Infinity Loop — romullus (CC BY-SA 4.0)</li><li>Alchemist&apos;s Orb — Tycho Magnetic Anomaly (CC BY 4.0)</li><li>Technotron — tamminen (CC BY 4.0)</li></ul></Section></div>
      <div className="mt-6"><Section title="Límites que el sistema respeta"><p className="text-sm text-mute">La IA no diagnostica, no interpreta resultados, no clasifica gravedad y no decide nada. Solo lee identificadores, detecta problemas de calidad, sugiere candidatas y ordena filas. Toda liberación exige revisión administrativa y autorización clínica humanas.</p></Section></div>
    </>
  );
}
