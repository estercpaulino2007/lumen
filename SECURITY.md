# SECURITY — riesgos, controles y roadmap

> Prototipo con datos ficticios. No se ha auditado externamente y no se afirma cumplimiento normativo.

## Activos protegidos
PDFs de resultados, vínculo paciente↔resultado, datos de contacto, códigos de acceso, bitácora.

## Controles implementados
| Área | Control | Dónde |
|---|---|---|
| Autenticación de personal | bcrypt (costo 10), rate limiting por IP y cuenta, mensajes genéricos | `api/auth/login` |
| Sesiones | Token aleatorio de 256 bits; solo se guarda su SHA-256; cookie `HttpOnly`, `SameSite=Lax`, `Secure` en producción; expiración (8 h personal / 15 min paciente), inactividad de 60 min, invalidación en logout, revocación por administración, cierre al desactivar cuenta; ciclo de vida auditado | `lib/auth.ts` |
| Reautenticación | Autorizar una entrega exige reingresar la contraseña | `api/results/[id]/clinical` |
| Autorización | RBAC en cada ruta del backend; proyecciones por rol (el laboratorio no ve candidatas ni otras pacientes); accesos denegados auditados | `requireRole`, `lib/views.ts` |
| Doble control | Quien confirma la asociación no puede autorizar | `lib/flow.ts` |
| CSRF | Encabezado personalizado obligatorio + verificación de `Origin` | `lib/http.ts` |
| Validación de entrada | Zod en todos los cuerpos JSON | rutas |
| Carga de archivos | Extensión `.pdf`, MIME `application/pdf`, firma `%PDF-`, 10 MB, nombre saneado, SHA-256, rechazo de duplicados, límite por hora | `api/results/upload` |
| Almacenamiento | Fuera de `/public`, cifrado AES-256-GCM con clave derivada de `LUMEN_MASTER_KEY` | `lib/storage.ts` |
| OTP | 6 dígitos con `crypto.randomInt`; guardado como HMAC con sal; 5 min; 5 intentos; bloqueo de 15 min; respuesta anti-enumeración | `api/portal/*` |
| Enlaces | HMAC firmados, 5 min, máx. 3 usos, **ligados a la sesión**, revocables, `no-store`, `noindex`, `no-referrer` | `api/portal/link`, `api/files/[token]` |
| Marca de agua | Fecha/hora, identificador parcial y leyenda en cada página | `lib/pdfgen.ts` |
| Mensajería | DLP clínica en todo aviso; plantillas fijas; teléfono/correo enmascarados | `lib/dlp.ts`, `lib/notify.ts` |
| Bitácora | Append-only, encadenada con SHA-256, sin rutas de edición/borrado, IP y user agent como HMAC | `lib/audit.ts` |
| Cabeceras | `X-Frame-Options`, `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `X-Robots-Tag` | `next.config.mjs` |
| Cámara | Procesamiento en el dispositivo; solo se envía aprobado/no aprobado | `components/Camera.tsx` |

## Amenazas consideradas
- **Entrega a la paciente equivocada** → puntaje explicable, homónimas, CURP, confirmación humana, doble control.
- **Fuga por reenvío del enlace** → enlace ligado a sesión, corta duración, usos limitados, marca de agua.
- **Fuerza bruta de OTP** → 5 intentos, bloqueo, rate limiting por IP y contacto.
- **Enumeración de pacientes** → respuesta genérica en `portal/start`.
- **Insider que altera registros** → bitácora encadenada y verificación visible.
- **Ingeniería social por mensajes** → avisos sin contenido clínico ni enlaces; el OTP aclara que EIRA nunca lo pedirá.
- **Bloqueo de un canal** → failover automático y entrega asistida.

## Riesgos residuales
- Clave de demo si no se define `LUMEN_MASTER_KEY`.
- Almacén JSON y estado efímero en memoria de un solo proceso (sin Valkey, los bloqueos se pierden al reiniciar).
- La bitácora es evidente ante manipulación, pero no inmutable: en piloto debe anclarse (WORM / tabla con permisos solo de inserción / sellado periódico del hash).
- El modelo de cámara se descarga de un CDN; en piloto debe servirse localmente con SRI.
- No hay MFA para el personal ni CSP estricta.
- Sin pruebas de penetración ni análisis de dependencias continuo.

## Roadmap de seguridad
1. KMS para la clave maestra y rotación de claves; cifrado por objeto en S3.
2. PostgreSQL con rol de aplicación sin `UPDATE/DELETE` sobre auditoría; sellado diario del hash de cabeza.
3. MFA (TOTP/WebAuthn) para personal clínico y administración.
4. CSP estricta con nonces; SRI para recursos externos.
5. Escaneo antivirus de PDFs y saneamiento (eliminación de JavaScript embebido).
6. Pentest externo, SAST/DAST en CI, Dependabot.
7. Plan de respuesta a incidentes y aviso a titulares.
