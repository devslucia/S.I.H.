# Asistente de uso del SIH y captura de mejoras

**Fecha:** 2026-10-28

## Qué hace

- **Ubicación:** botón flotante abajo a la derecha en todas las pantallas autenticadas. El componente es `components/asistente/AsistenteIA.tsx` y se monta en `app/(dashboard)/layout.tsx`.
- **Qué responde:** preguntas de **uso del sistema**, por ejemplo «¿Cómo admito un paciente?», «¿Dónde cargo la evolución?» o «¿Cómo programo una cirugía?».
- **Contexto que usa:** el **rol de la sesión** (el que mande el cliente se ignora) y la **pantalla actual**.
- **Permisos:** si el rol no puede hacer la acción, lo dice y nombra qué roles pueden.
- **Consultas clínicas:** **nunca** da consejos clínicos. Ante dosis, tratamientos, diagnósticos o conductas responde siempre lo mismo: «No puedo dar consejos médicos. Solo puedo ayudarte con el uso del sistema.»
- **Detección de mejoras:** reconoce frases como «estaría bueno que», «falta que», «deberían agregar», «no me resulta práctico», «sería útil», «me gustaría que» o «podrían agregar». Muestra la mejora detectada y pregunta «¿Querés que registre esta mejora?». Se puede responder con los botones o escribiendo «sí» o «no». Al registrarla se muestra un toast.
- **Privacidad:** no guarda la conversación. Solo se persisten las mejoras que el usuario acepta registrar.

## Motor

| Prioridad | Condición | Proveedor |
|---|---|---|
| 1 | `OPENAI_API_KEY` | OpenAI o cualquier API compatible (`OPENAI_BASE_URL`). Modelo: `OPENAI_MODEL` (por defecto `gpt-4o-mini`) |
| 2 | `ANTHROPIC_API_KEY` | Anthropic. Modelo: `ASISTENTE_ANTHROPIC_MODEL` (por defecto `claude-haiku-5-5`) |
| 3 | Sin claves, o `ASISTENTE_IA_PROVEEDOR=local` | Motor local: intents sobre la base de conocimiento |

- **Reglas siempre locales:** la guardia clínica y la detección de mejoras corren localmente aunque haya un proveedor configurado. Así la regla clínica y la captura de mejoras no dependen del LLM.
- **Fallos del proveedor:** si el proveedor falla o tarda más de 15 s, responde el motor local.
- **Qué se envía al proveedor:** la consulta, el rol, la ruta y fragmentos de la base de conocimiento. Nunca se envían datos de pacientes.
- **Base de conocimiento:** `lib/asistente/conocimiento.ts`, armada desde `docs/casos-de-uso-sih.md` y las pantallas reales. Si cambia una pantalla o un permiso, hay que actualizarla.
- **Límite de uso:** 20 consultas por minuto por usuario.

## API

| Método | Ruta | Roles | Qué hace |
|---|---|---|---|
| POST | `/api/asistente/chat` | Cualquier usuario autenticado | Recibe `{ mensaje, ruta, historial? }` y devuelve `{ respuesta, fuente, sugerencias, mejoraDetectada, borradorMejora? }` |
| POST | `/api/asistente/mejoras` | Cualquier usuario autenticado | Registra una mejora (`titulo`, `descripcion`, `modulo`, `ruta`, `prioridad`). Usuario y rol salen de la sesión |
| GET | `/api/asistente/mejoras` | ADMIN | Lista las mejoras con filtros `?estado=&modulo=&prioridad=&q=` y conteos por estado |
| PATCH | `/api/asistente/mejoras/[id]` | ADMIN | Cambia `estado` y/o `prioridad` |

## Modelo

`MejoraSugerida` está definido en `prisma/schema.prisma` y se crea con la migración `20261028120000_add_mejora_sugerida`.

- **Estados:** NUEVA, EN_REVISION, PLANIFICADA, IMPLEMENTADA y DESCARTADA.
- **Prioridades:** BAJA, MEDIA y ALTA. Por defecto es MEDIA; pasa a ALTA si el texto dice «urgente», «bloquea» y similares.
- **Origen:** `ASISTENTE_IA`.

## Panel ADMIN

`/configuracion/mejoras` (también hay una card en `/configuracion`):

- KPI por estado.
- Filtros por estado (chips), módulo y prioridad, más búsqueda.
- Tabla con autor, rol, pantalla de origen y fecha.
- Selectores para cambiar la prioridad y el estado (en revisión, planificada, implementada o descartada).
