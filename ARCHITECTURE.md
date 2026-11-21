# ARCHITECTURE — decisiones técnicas

## Vista general
Monolito Next.js 15 (App Router) con API Routes en Node. Un solo proceso, sin servicios externos obligatorios: se levanta con `npm install && npm run dev` en Windows, macOS o Linux.

```
[Laboratorio] --PDF--> /api/results/upload --(SHA-256, AES-GCM)--> storage/results/*.enc
                                   └── queue ──> extract (pdf.js) ──> match ──> ReviewTask
[Captura] --confirmar--> associate()  ──┐
[Clínica] --autorizar + contraseña--> clinicalDecision() ──> notify (DLP → SMS→correo→WhatsApp→asistida)
[Paciente] --OTP / código asistido--> sesión 15 min ──> /api/portal/link ──> /api/files/[token] (marca de agua)
Todo evento ──> audit.jsonl (encadenado)
```

## Decisiones
| Decisión | Alternativa | Por qué |
|---|---|---|
| Almacén JSON atómico con el modelo de Prisma | Prisma + SQLite | Prisma descarga binarios nativos por plataforma; en un hackathon, que corra en cualquier laptop sin compilar pesa más. El schema de piloto está en `docs/schema.prisma` y el modelo es 1:1. |
| pdf.js (Mozilla) para leer texto | Tesseract en todo | El 100 % de los PDFs de laboratorio digitales traen capa de texto; OCR de imagen queda para escaneos (roadmap). |
| Extracción por etiquetas conocidas | LLM | Determinista, explicable, sin enviar datos de salud a terceros y sin riesgo de "interpretar". |
| Puntaje ponderado explicable | Modelo de ML | Las coordinadoras deben entender por qué; la fórmula es auditable. |
| Bitácora JSONL encadenada | Tabla normal | Evidencia de manipulación sin infraestructura; en piloto se replica en PostgreSQL con permisos de solo inserción. |
| Enlaces HMAC + registro en servidor | URLs pre-firmadas de S3 | Permiten límite de usos, revocación y vínculo con la sesión. |
| Cámara en el navegador (face-api.js) | Biometría en servidor | Privacidad por diseño: la imagen nunca sale del dispositivo; es una señal de presencia, no de identidad. |
| Valkey opcional detrás de una interfaz | Valkey obligatorio | Demo sin Docker; con `VALKEY_URL` los secretos efímeros expiran solos y no tocan disco. |
| Dexie/IndexedDB + conflictos por campo | Último que escribe gana | Nunca sobrescribir en silencio datos de pacientes. |
| Flujo de dominio en `lib/flow.ts` | Lógica en rutas | La semilla y la API usan exactamente el mismo código: los datos de demo son realistas. |

## Modelo de estados de un resultado
`ocrStatus`: pending → processing → done | needs_ocr | failed
`associationStatus`: pending → suggested → confirmed | confirmed_manual | manual_review | rejected | correction_requested
`reviewStatus`: pending → approved | correction_requested | rejected
`clinicalStatus`: pending → authorized | returned | blocked
`deliveryStatus`: not_sent → notified | assisted_pending | failed → accessed → downloaded

## Escalabilidad
- Interfaces `Storage`, `KV` y `queue` listas para S3, Valkey y workers.
- Plantillas, canales, umbrales y políticas configurables por organización.
- Nuevos tipos de estudio (VPH, mastografía) = nuevo `examType` + etiquetas del extractor.
