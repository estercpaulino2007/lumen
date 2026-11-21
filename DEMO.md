# DEMO — guion de 2 minutos (LUMEN)

**Preparación (antes de subir al escenario):**
- `npm run dev`, abrir `http://localhost:3000`, pulsar **Cargar datos de demostración**.
- Pestañas abiertas: (1) Laboratorio · (2) Captura · (3) Profesional de salud (otra ventana/incógnito) · (4) Portal en el celular o vista móvil.
- Descargar `01-maria-lopez-segunda-visita.pdf` desde la pantalla del laboratorio.
- En la Central de Notificaciones, dejar **WhatsApp en OFF** (estado "bloqueado").

| Tiempo | Qué mostrar | Qué decir |
|---|---|---|
| 0:00–0:15 | Portada | "Hoy EIRA entrega más de 300 Papanicolaou al mes por WhatsApp. Cuando la cuenta se bloquea, todo se detiene. Y un PDF clínico circula sin control. LUMEN lo resuelve con doble revisión humana." |
| 0:15–0:35 | **Laboratorio** sube el PDF → **Captura** abre el detalle | "Huella SHA-256, cifrado AES-256 y lectura solo de identificadores: la parte clínica nunca se lee. El documento dice 'Maria Lopez' sin acentos y otro teléfono: el puntaje explicable da 93 %, teléfono parcial. Nadie se asocia sola: confirmo yo." → *Confirmar asociación* |
| 0:35–0:50 | **Profesional de salud** | "Otra persona autoriza (doble control), con motivo y contraseña." → *Autorizar entrega* |
| 0:50–1:05 | **Central de Notificaciones** | "WhatsApp está bloqueado y aun así el aviso salió por SMS. Y si alguien intenta escribir 'tu resultado salió anormal'…" → *Revisar mensaje* → **Bloqueado**. |
| 1:05–1:30 | **Portal** en el celular | `55 5123 1234` → código de la Central → cámara opcional (o "Continuar sin cámara") → *Ver*. "Enlace de 5 minutos, ligado a su sesión y con marca de agua. Si lo reenvía, no abre." |
| 1:30–1:45 | **Auditoría** + **Seguimiento** | "Cada paso queda en una bitácora encadenada: si alguien borra una línea, el panel lo detecta. Y si una paciente no abre su resultado en 48 h, EIRA recibe la tarea. Para quien no tiene celular: código asistido impreso." |
| 1:45–2:00 | Panel / *Implementado vs simulado* | "Todo esto funciona hoy con datos ficticios. Simulamos solo los proveedores de SMS y el OCR de escaneos. Para un piloto: PostgreSQL, un proveedor de SMS y validar con EIRA las 10 preguntas del README." |

**Luminy (10 s, si hay tiempo):** abrir Luminy → "¿Qué hay pendiente hoy?" → luego escribir "¿el resultado de María es anormal?" → se ve el **límite clínico**. En el portal, la paciente recibe el botón "Quiero que una profesional me contacte".

**Plan B:** si falla la red, usar "Continuar sin cámara"; si falla la carga, usar los resultados ya sembrados en "Aguardando revisión".
**Extra si sobra tiempo:** Brigada offline → desconectar → editar teléfono → "Simular edición desde otra brigada" → reconectar → conflicto → resolver.
