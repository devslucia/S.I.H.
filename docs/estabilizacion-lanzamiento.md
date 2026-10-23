# Estabilización pre-lanzamiento — flujos críticos y coherencia entre módulos

**Fecha:** 2026-10-22
**Alcance:** circuito clínico Admisión → Internación/Camas → HC → Enfermería → Quirófano → Anestesia → Farmacia → Facturación → Epicrisis/Alta.

Criterio aplicado en toda la API:
- sin sesión → **401**; sin permiso / sin vínculo con la internación → **403** con mensaje claro;
- recurso inexistente → **404**; existe pero vacío → **200** con `null` / `{}`.
- Todo formulario clínico confirma con toast de éxito o muestra el motivo real del error (`lib/api-errors.ts`).

## Piezas comunes nuevas

| Archivo | Para qué |
|---|---|
| `lib/hc-context.ts` → `ensureHcEpisodio()` | Garantiza HC + episodio de la internación (idempotente). Reemplaza ~15 bloques que devolvían 404 si faltaba el episodio. Camino normal: solo lecturas. |
| `lib/internaciones-visibility.ts` → `internacionAccessError()` | Guard único: 404 si no existe, 403 si existe pero el usuario no tiene vínculo (antes: 404 engañoso). |
| `lib/api-errors.ts` → `apiErrorMessage()` | Mensaje de error en español para toasts (usa el `error` del backend o un texto por status). |
| `lib/validations/sanitize.ts` → `blankToNull()` | Convierte `""` de selects/inputs opcionales en `null` antes de validar. |

## Bugs críticos encontrados y corregidos

### Quirófano / libro quirúrgico
1. **No había forma de iniciar una cirugía.** Ningún botón pasaba PROGRAMADA → EN_CURSO, y "Cerrar cirugía" solo aparece en EN_CURSO. Las 3 cirugías de la base estaban en PROGRAMADA. → Botón **Iniciar cirugía** (cualquier integrante asignado), registra hora de inicio si falta y pasa la internación a EN_QUIROFANO.
2. **El cirujano no podía cerrar la cirugía:** `estado` no estaba entre los campos editables de MEDICO y se descartaba en silencio, mostrando "Cirugía cerrada correctamente". → Transiciones explícitas en `validarTransicionEstado()` (iniciar: equipo; cerrar/cancelar: cirujano/ayudante o ADMIN; reprogramar: ADMIN).
3. **Instrumentador y anestesiólogo no podían guardar el libro:** el formulario reenvía `hallazgos`/`evolucionPostInt`/`indicacionesPostoperatorias` (aunque estén vacíos) y el backend rechazaba con 403 por la sola presencia de la clave. → El frontend envía solo lo que cambió y el backend rechaza solo si el valor cambia. Los campos ignorados por permiso se informan (`_camposIgnorados`) con un toast de advertencia.
4. **Reprogramar dejaba la cirugía muerta:** estado REPROGRAMADA = solo lectura y no se podía iniciar. → Reprogramar mantiene la cirugía PROGRAMADA en la nueva fecha (el historial queda en `Reprogramacion`); las REPROGRAMADA existentes se tratan como programadas.
5. **El médico veía la internación en "programar cirugía" pero al crear recibía 403** si no era tratante. → Cualquier MEDICO puede programar sobre una internación activa; si no indica cirujano, queda como cirujano.
6. **Fechas de cirugía un día antes** en Argentina (se guardaban a 00:00 UTC). → Se guardan a 12:00 UTC.
7. **Cirujano no podía cargar prácticas/implantes/medicamentos** desde su parte (requireRole excluía MEDICO aunque el chequeo de asignación lo contemplaba).
8. **Prácticas sin galeno configurado:** dentro de la transacción se hacía `return NextResponse.json(...)`, que **confirmaba la práctica sin el cargo** y respondía 201 con un objeto inválido. → Se registra práctica + cargo a $0 y se devuelve una advertencia visible.
9. **Circulante / instrumentador sin asignar:** no existe rol global CIRCULANTE (suele ser ENFERMERO) y el libro lo rechazaba; el instrumentador no podía abrir cirugías sin instrumentador asignado. → ENFERMERO puede abrir el libro si es circulante; instrumentador/anestesiólogo pueden tomar el puesto vacante y quedan asignados al guardar.
10. La internación ahora solo cambia de estado por la cirugía mientras está en el circuito asistencial (nunca se pisa un alta).

### Protocolo de anestesia
11. El GET había quedado **sin control de acceso** (un "fix" anterior lo quitó para evitar 404): cualquier rol clínico leía cualquier protocolo. → Acceso restaurado con el guard 403/404 y visibilidad corregida.
12. **404 al abrir/guardar si la cirugía no tenía anestesiólogo asignado.** → El anestesiólogo ve cirugías propias o sin anestesiólogo; al guardar el protocolo queda asignado.
13. Se usaba `cirugia.findFirst` sin orden (cirugía arbitraria si había varias). → Se usa la cirugía del libro (`cirugiaId`) o la más reciente no cancelada.
14. Un 403 de rol se mostraba como "Firmado". → Modo **Solo lectura** explícito para roles que no editan; error de carga visible; toast al firmar. Firmar ya no exige `protocoloId` en el body.

### Historia clínica
15. **La epicrisis no se podía firmar:** el frontend hace POST sin body y el endpoint hacía `req.json()` → 500. Además la firma pasaba la internación a ALTA_MEDICA desde cualquier estado (podía "retroceder" un alta administrativa) y ponía la cama EN_LIMPIEZA con el paciente todavía internado. → Resuelve la epicrisis por episodio, solo pasa a ALTA_MEDICA desde ACTIVA/POSTQUIRURGICO, no toca la cama.
16. Endpoints de HC devolvían **404 si faltaba HC/episodio** (internaciones legadas). → `ensureHcEpisodio()`.
17. Evolución vacía → 500; control de enfermería con tipo/hora inválidos → 500; epicrisis con selects vacíos (`""` en enums) → 500. → Validaciones con mensajes claros (400).
18. **Médico cirujano / interconsultor recibía 404** en la HC de su paciente (solo veían los tratantes). → Visibilidad de MEDICO = tratante ∪ equipo quirúrgico ∪ interconsulta (misma política que `pacientes-access`).
19. Protocolo quirúrgico: sin cirugía devolvía 404 → 200 `null`; el cirujano no podía guardar (solo INSTRUMENTADOR).
20. Guardados mudos: evolución, prescripción, preanestesia (y panel médico) no confirmaban; anamnesis/epicrisis mostraban error genérico. → Toasts de éxito y error con motivo real.

### Admisión / internación / camas
21. **Admitir sin cama u obra social fallaba con 400**: el form envía `""` y el schema exigía UUID. Además **cualquier 400 se mostraba como "CUIL inválido"** bajo el campo CUIL. → `blankToNull()` en el servidor; el error solo se marca en CUIL si es del CUIL.
22. ADMISION no podía listar médicos (`/api/usuarios/medicos` → 403): selector de médico tratante vacío al admitir. Tampoco podía asignar tratantes ni registrar alergias. → Habilitado (editar/borrar alergias sigue siendo clínico).
23. Fecha de nacimiento un día antes al crear paciente por `/api/pacientes` (UTC). → Se usa el mismo `fechaNacSchema` que admisión (mediodía local).
24. Admisión no guardaba `tipoAtencion`, `diagnosticoCIE`, `medicoSolicitante`; ocupación de cama no atómica. → Corregido.
25. **El mapa de camas mostraba pacientes ya egresados** en camas libres, y se podía liberar a mano una cama con paciente en ALTA_MEDICA/ALTA_ENFERMERIA (riesgo de doble asignación). → La cama está ocupada hasta el alta administrativa en ambos casos.
26. El alta administrativa ahora cierra el episodio (FINALIZADO).

### Enfermería
27. **Aplicación de medicación "exitosa" que no se registraba:** la API responde 207 cuando un ítem falla (ej. stock insuficiente) y la UI lo trataba como éxito. El motivo real se reemplazaba por "Error interno". → Se lee `ok` del cuerpo, se muestra el motivo ("Stock insuficiente para X").
28. Hoja de enfermería y medicación adicional sin confirmación. → Toasts.
29. `/enfermeria` cargaba prescripciones de cada internado en serie. → Lotes de 4 en paralelo (respeta `connection_limit=1`).

### Farmacia
30. **El modal "Movimiento de stock" fallaba siempre (405):** el `POST /api/farmacia/stock` se eliminó por error en el commit `18c5f7a`. → Restaurado, con egreso atómico (sin stock negativo concurrente). Toasts en todas las acciones.

### Auth / RBAC
31. **Usuarios inactivos podían iniciar sesión** (había 3 en la base). → `authorize` exige `activo`.
32. Login: búsqueda de email case-insensitive (3 usuarios tienen mayúsculas), error de red visible.
33. `/api/usuarios` (directorio de personal) solo para ADMIN/ADMISION/MEDICO: el libro de quirófano y la impresión de carpeta quedaban sin nombres para otros roles. → Lectura para roles clínicos; el email solo se expone a ADMIN.
34. Carpeta completa (impresión de HC) habilitada para ENFERMERO.

### Otros módulos (P1)
35. Consultorio: confirmar / presente / cancelar / ausente / iniciar / finalizar sin feedback. → Toasts.
36. Guardia: los errores de acciones se perdían (`void patch(...)` con excepción no capturada). → Toast de error y el modal queda abierto para reintentar.
37. Configuración (nomencladores, galenos): acciones sin feedback. → Toasts.

## Riesgos residuales conocidos
- **Galenos: 0 configurados.** Todas las prácticas quirúrgicas se cargan a $0 hasta configurarlos (Configuración → Galenos por obra social).
- Sesiones JWT ya emitidas a un usuario desactivado siguen vigentes hasta expirar (sin revocación server-side).
- Latencia de la base: el dashboard tarda ~15 s desde fuera de la región (queries secuenciales por `connection_limit=1`).
- El dashboard todavía muestra KPIs globales a todos los roles (pendiente de AGENTS.md).
- No hay tests automatizados de los flujos de escritura (el smoke test de esta pasada fue de solo lectura por rol).
