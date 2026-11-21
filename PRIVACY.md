# PRIVACY — minimización, consentimiento, retención y acceso

> Diseño de privacidad del prototipo. Las referencias normativas son orientativas y deben validarse con asesoría legal antes de un piloto: Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), NOM-004-SSA3-2012 (expediente clínico) y NOM-024-SSA3-2012 (sistemas de información de registro electrónico para la salud).

## Principios
1. **Minimización**: LUMEN no necesita entender el resultado para entregarlo. El extractor lee solo identificadores administrativos; la sección clínica no se lee, no se indexa y no se guarda fuera del PDF cifrado.
2. **Nada clínico fuera del PDF**: avisos, bitácora, tareas de seguimiento, exportaciones y notas de contacto no contienen diagnóstico ni hallazgos (la guardia DLP lo impide en mensajes; las tareas registran "contacto indicado", no el motivo).
3. **Necesidad de saber**: cada papel ve solo lo necesario (el laboratorio no ve otras pacientes; la paciente solo lo suyo; el PDF se abre a demanda, no por defecto).
4. **Transparencia**: toda consulta del PDF, por personal o paciente, queda registrada.

## Datos tratados
| Dato | Finalidad | Dónde |
|---|---|---|
| Nombre, fecha de nacimiento, municipio, CURP (opcional) | Asociar el resultado correcto | Registro de paciente |
| Teléfono / correo | Aviso neutro y OTP | Registro (se muestran enmascarados) |
| PDF del laboratorio | Entrega | Almacenamiento cifrado |
| Eventos de acceso | Seguridad y rendición de cuentas | Bitácora (IP y navegador como HMAC) |
| Resultado de verificación por cámara | Señal adicional de presencia | Solo aprobado/no aprobado y puntaje; **ninguna imagen ni vector** |

## Consentimiento
Consentimiento por canal (SMS, correo, WhatsApp, cámara, estadística anonimizada) con versión y fecha; visible en *Privacidad y consentimiento*. WhatsApp solo con consentimiento explícito y plantilla neutra. La cámara siempre es opcional, con "Continuar sin cámara" igual de visible.

## Retención (configurable)
- PDFs: 180 días por defecto (*Privacidad* → Retención). En piloto: borrado programado + registro del borrado.
- Enlaces: 5 minutos. OTP: 5 minutos. Códigos asistidos: 24 h, un uso.
- Bitácora: se conserva (no contiene datos clínicos).

## Derechos de las titulares (ARCO)
Acceso, rectificación, cancelación y oposición: en el piloto se canalizan por EIRA con un flujo auditado. El portal ya permite el acceso a sus documentos; la rectificación de datos de contacto se hace con personal de EIRA.

## Exportaciones
- **Anonimizada**: seudónimos HMAC irreversibles sin la clave, rango de edad en lugar de fecha, sin nombre ni contacto.
- **Identificada**: solo registros seleccionados, con motivo obligatorio y auditada.

## Personas sin canal digital
Código asistido impreso + fecha de nacimiento, siempre con personal autorizado; tarea de entrega presencial automática.
