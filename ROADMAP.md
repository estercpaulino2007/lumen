# ROADMAP — del prototipo a un piloto real

## Fase 0 · Validación con EIRA (2 semanas)
- Responder las 10 preguntas abiertas del README.
- Mapear el formato real de los PDFs de 1–2 laboratorios aliados.
- Prueba de usabilidad con 3 personas de captura, 1 profesional de salud y 5 pacientes (con tarjetas de papel si hace falta).
- Revisión legal: aviso de privacidad, consentimiento, convenio con laboratorio (encargado del tratamiento).

## Fase 1 · Infraestructura de piloto (3–4 semanas)
- PostgreSQL (schema en `docs/schema.prisma`) + migración del almacén JSON.
- Almacenamiento S3-compatible con cifrado por objeto y KMS; política de retención automática.
- Valkey para OTP, rate limiting y fila (Valkey Streams / BullMQ) con reintentos.
- Proveedor de SMS con plantilla aprobada y número dedicado; correo transaccional con SPF/DKIM.
- WhatsApp Business API oficial con plantilla neutra (opcional, nunca único canal).
- MFA para personal; CSP estricta; servir los modelos de cámara localmente.

## Fase 2 · Operación (piloto de 3 meses, 1 jornada)
- OCR de imagen (Tesseract en servidor) para escaneos, siempre con revisión humana.
- Integración con laboratorio: buzón SFTP o API; a futuro HL7/FHIR (`DiagnosticReport` + `DocumentReference`).
- Folio de muestra impreso con QR en la jornada (sube la certeza de asociación a ~100 %).
- Capacitación (1 h captura, 30 min profesionales) y manual de operación; respaldo diario.
- Indicadores de éxito: % entregado en < 72 h, % consultado, tiempo a seguimiento, 0 entregas a paciente equivocada.

## Fase 3 · Escala
- Interoperar con el Reto 1 (expediente único) y el Reto 3 (indicadores de impacto).
- Multi-organización (otras A.C. y municipios) con aislamiento por organización.
- Pentest externo y auditoría de privacidad antes de ampliar.

## Qué falta para usar datos reales
Infraestructura de Fase 1, consentimiento firmado, convenio con laboratorio, pentest, plan de incidentes y aprobación de EIRA. **Hasta entonces, solo datos ficticios.**
