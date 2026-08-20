# Casos de Uso — SIH (Sistema Informático Hospitalario)

> Clínica Premium SIH · Documento de referencia para capacitación y QA.
> Basado en el flujo real del código (`app/`, `app/api/`, `lib/`, `prisma/schema.prisma`).
> Roles del sistema: `ADMIN`, `MEDICO`, `ENFERMERO`, `ANESTESIOLOGO`, `INSTRUMENTADOR`, `ADMISION`, `FACTURACION`, `FARMACIA`, `SECRETARIA`. `CIRCULANTE` es un rol **de contexto** (asignado a una cirugía, no de sesión).

---

## Índice por módulo

| # | Módulo | Casos de uso |
|---|--------|--------------|
| 1 | Auth / login / sesiones | CU-01, CU-02 |
| 2 | Dashboard por rol | CU-03 |
| 3 | Admisión y pacientes | CU-04, CU-05, CU-06, CU-07 |
| 4 | Camas | CU-08, CU-09 |
| 5 | Historia clínica | CU-10, CU-11, CU-12, CU-13, CU-14 |
| 6 | Enfermería | CU-15, CU-16, CU-17, CU-18 |
| 7 | Quirófano y libro quirúrgico | CU-19, CU-20, CU-21, CU-22 |
| 8 | Protocolo de anestesia | CU-23, CU-24 |
| 9 | Consultorio / turnos / horarios | CU-25, CU-26, CU-27 |
| 10 | Farmacia | CU-28, CU-29 |
| 11 | Obras sociales | CU-30 |
| 12 | Nomenclador | CU-31, CU-32, CU-33 |
| 13 | Galenos por OS | CU-34 |
| 14 | Facturación | CU-35, CU-36 |
| 15 | Impresión de carpeta HC | CU-37 |
| 16 | Configuración / usuarios / ABMs | CU-38, CU-39 |

---

## Módulo 1 — Auth / login / sesiones

### CU-01 Login
- **Módulo:** Auth / sesiones
- **Actor(es):** Cualquier usuario del sistema (todos los roles)
- **Precondiciones:** Usuario creado por ADMIN (`/configuracion/usuarios`) con email y contraseña. Usuario `activo = true`.
- **Flujo principal:**
  1. El usuario ingresa a `/login` con email y contraseña.
  2. El sistema valida credenciales (bcrypt) vía NextAuth (Credentials).
  3. El sistema crea sesión JWT con `id`, `rol`, `matricula`, `apellido`.
  4. El usuario es redirigido a `/` (dashboard) con los módulos de su rol.
- **Flujos alternativos / errores:**
  - Credenciales inválidas → mensaje de error en el formulario, sin sesión.
  - Sesión activa y visita `/login` → redirige a `/`.
  - Rate-limit de login: 60 intentos/IP cada 15 min, o 10 por par IP+email cada 15 min → HTTP 429 "Demasiados intentos".
  - Acceso a `/api/*` sin sesión → 401 "No autorizado".
  - Acceso a una página sin sesión → redirect a `/login`.
- **Postcondiciones:** Sesión iniciada; el sidebar muestra solo los módulos permitidos al rol.
- **Reglas de negocio clave:** Toda API exige sesión (middleware). La autorización fina por rol se resuelve en cada endpoint.
- **RBAC:** Todos los roles pueden loguearse. Ningún rol puede omitir el login.

### CU-02 Cierre de sesión
- **Módulo:** Auth / sesiones
- **Actor(es):** Usuario autenticado
- **Precondiciones:** Sesión activa.
- **Flujo principal:**
  1. El usuario elige "Cerrar sesión".
  2. El sistema destruye la sesión JWT.
  3. El usuario vuelve a `/login`.
- **Flujos alternativos / errores:** — (sin alternativas; la sesión expira también por JWT).
- **Postcondiciones:** Sin sesión; las APIs devuelven 401.
- **Reglas de negocio clave:** —
- **RBAC:** Todos los roles.

---

## Módulo 2 — Dashboard por rol

### CU-03 Dashboard operativo por rol
- **Módulo:** Dashboard
- **Actor(es):** Todos los roles
- **Precondiciones:** Sesión iniciada.
- **Flujo principal:**
  1. El usuario ingresa a `/`.
  2. El sistema muestra KPIs según rol: camas (ocupadas/libres), quirófano (programadas/en curso), admisiones (en espera), turnos del día, prescripciones pendientes.
  3. El sistema muestra la sección "Alertas / Pendientes" (stock bajo, prescripciones por aplicar, turnos, etc.).
  4. El sistema muestra "Agenda de turnos / Actividad reciente".
  5. El usuario accede a los módulos habilitados para su rol (accesos rápidos y sidebar filtrado).
- **Flujos alternativos / errores:**
  - Rol sin módulos de escritura (ej. ENFERMERO ve Camas/Enfermería, no Facturación) → sidebar solo con módulos permitidos.
- **Postcondiciones:** Navegación a módulos según rol.
- **Reglas de negocio clave:** El sidebar filtra por rol; el dashboard es resumen operativo (sin acciones de escritura).
- **RBAC:** Ver KPIs: todos. Acceso a módulos: ver mapa de permisos por módulo.

---

## Módulo 3 — Admisión y pacientes

### CU-04 Registrar paciente nuevo
- **Módulo:** Admisión / pacientes
- **Actor(es):** ADMIN, ADMISION, SECRETARIA
- **Precondiciones:** Sesión con rol permitido. Acceso al módulo Admisión o Consultorio.
- **Flujo principal:**
  1. El usuario abre `/admision` y usa el buscador de pacientes (DNI o nombre).
  2. Si no existe, registra el paciente nuevo: DNI (único), apellido, nombre, sexo, fecha de nacimiento, CUIL, teléfono, email, grupo sanguíneo, estado civil.
  3. El sistema valida el DNI (formato, duplicado).
  4. El paciente queda disponible para admisión, consultorio y HC.
- **Flujos alternativos / errores:**
  - DNI duplicado → HTTP 409 (no se crea).
  - Campos obligatorios faltantes → 400 con detalle.
  - SECRETARIA: crea pacientes solo desde Consultorio; ve datos mínimos de otros pacientes.
- **Postcondiciones:** Paciente persistido; puede ser admitido o agendado.
- **Reglas de negocio clave:** DNI único. La visibilidad del padrón es por rol (SECRETARIA solo turnos propios, ENFERMERO solo internados activos, MEDICO solo sus pacientes, etc.).
- **RBAC:** Crear: ADMIN/ADMISION/SECRETARIA. Editar: ADMIN/ADMISION. Eliminar: ADMIN (bloqueado si tiene internaciones → 409). Leer padrón: ADMIN, MEDICO, ENFERMERO, ANESTESIOLOGO, INSTRUMENTADOR, CIRCULANTE, ADMISION, SECRETARIA (+FACTURACION en detalle).

### CU-05 Admisión con internación (asignar cama)
- **Módulo:** Admisión / internaciones
- **Actor(es):** ADMIN, ADMISION
- **Precondiciones:** Paciente existente (o recién registrado). Obra social activa para internación. Cama LIBRE disponible. Sesión ADMIN/ADMISION.
- **Flujo principal:**
  1. El usuario abre la ficha del paciente (`/admision/[id]`) y elige "Nueva internación".
  2. Completa el modal: cama (desde el mapa), OS, n.º de afiliado, tipo beneficiario (TITULAR/FAMILIAR), médico(s) tratante(s), tipo de ingreso (PROGRAMADO/URGENCIA/GUARDIA/DERIVACION), motivo, peso, diagnóstico.
  3. El sistema valida: OS usable (estadoInternacion = ACTIVA), cama LIBRE, paciente sin internación ACTIVA previa.
  4. El sistema crea en una transacción: internación (ACTIVA), HC, episodio INTERNACION (EN_CURSO) y ocupa la cama atómicamente.
  5. La internación aparece en `/admision/internados`, en el mapa de camas y en Atención Médica.
- **Flujos alternativos / errores:**
  - OS con estadoInternacion = SUSPENDIDA → rechazo: no se puede internar con esa OS (CU-30).
  - Cama OCUPADA o FUERA_DE_SERVICIO → no seleccionable; se elige otra o se registra en espera (CU-06).
  - Sin cama disponible → la internación queda ACTIVA sin cama y pasa a `/admision/espera`.
  - Paciente con internación ACTIVA previa → rechazo.
- **Postcondiciones:** Internación ACTIVA con cama OCUPADA; HC y episodio creados; notificaciones de "nueva indicación" posibles.
- **Reglas de negocio clave:** 1 paciente = 1 internación ACTIVA. Cama OCUPADA transición atómica. Episodio INTERNACION es el núcleo de la HC.
- **RBAC:** Crear internación: ADMIN/ADMISION. Leer internaciones: ADMIN, MEDICO, ENFERMERO, ANESTESIOLOGO, INSTRUMENTADOR, FACTURACION, ADMISION (MEDICO solo las que trata; ANESTESIOLOGO/INSTRUMENTADOR vía cirugía; ENFERMERO/ADMISION/FACTURACION solo activas).

### CU-06 Paciente en espera de cama
- **Módulo:** Admisión
- **Actor(es):** ADMIN, ADMISION
- **Precondiciones:** Internación ACTIVA sin cama (admitida sin disponibilidad).
- **Flujo principal:**
  1. El paciente figura en `/admision/espera` (KPIs "En espera / Urgencias").
  2. Cuando hay cama LIBRE, el usuario abre la ficha y asigna la cama (misma validación que CU-05 paso 3-4).
  3. La internación pasa a `/admision/internados` con cama OCUPADA.
- **Flujos alternativos / errores:**
  - Cama ocupada entre la selección y el guardado → transición atómica rechaza y se informa.
- **Postcondiciones:** Cama asignada; internación visible en el mapa.
- **Reglas de negocio clave:** La ocupación es atómica (sin doble asignación).
- **RBAC:** ADMIN/ADMISION.

### CU-07 Gestión de alergias del paciente
- **Módulo:** Admisión / pacientes
- **Actor(es):** ADMIN, MEDICO, ANESTESIOLOGO (escritura); lectura amplia
- **Precondiciones:** Paciente existente.
- **Flujo principal:**
  1. En la ficha del paciente, el usuario agrega/edita/elimina alergias (sustancia, severidad, observación).
  2. El sistema normaliza la sustancia (mayúsculas) y rechaza duplicados.
- **Flujos alternativos / errores:**
  - Sustancia duplicada → 409.
- **Postcondiciones:** Las alergias participan en el bloqueo de prescripciones (BLOQUEADA_ALERGIA) y en el chequeo de medicación ad-hoc.
- **Reglas de negocio clave:** Las alergias son el insumo del bloqueo automático de medicación.
- **RBAC:** Escribir: ADMIN/MEDICO/ANESTESIOLOGO. Leer: ADMIN, MEDICO, ENFERMERO, ANESTESIOLOGO, INSTRUMENTADOR, ADMISION.

---

## Módulo 4 — Camas

### CU-08 Cambio de estado manual de cama
- **Módulo:** Camas
- **Actor(es):** ADMIN, ADMISION
- **Precondiciones:** Cama sin internación activa.
- **Flujo principal:**
  1. El usuario abre `/camas` (mapa por sector).
  2. Selecciona una cama y cambia su estado: LIBRE → EN_LIMPIEZA → LIBRE, o FUERA_DE_SERVICIO.
- **Flujos alternativos / errores:**
  - Cama con internación ACTIVA → el sistema bloquea el cambio manual de estado (la transición la controla el flujo de internación/alta).
  - FUERA_DE_SERVICIO no puede recibir pacientes (CU-05).
- **Postcondiciones:** Estado actualizado en el mapa y KPIs de ocupación.
- **Reglas de negocio clave:** Transición atómica con bloqueo por internación activa.
- **RBAC:** Mover/actualizar estado: ADMIN/ADMISION. Leer mapa: ADMIN, MEDICO, ENFERMERO, ANESTESIOLOGO, INSTRUMENTADOR, FACTURACION, ADMISION. Crear/eliminar cama: ADMIN (eliminar bloqueado si tiene internación activa).

### CU-09 Transiciones automáticas de cama por internación
- **Módulo:** Camas / internaciones
- **Actor(es):** Sistema (automático); iniciador según flujo
- **Precondiciones:** Internación ACTIVA.
- **Flujo principal:**
  1. Admisión (CU-05) → la cama pasa a OCUPADA.
  2. Alta médica (CU-13) o firma de epicrisis → la cama se libera (LIBRE / EN_LIMPIEZA según flujo de alta).
- **Flujos alternativos / errores:**
  - Pase de cama interno → se registra `PaseInterno` (cama anterior/nueva, sector, tipo pensión).
- **Postcondiciones:** El mapa y las listas reflejan la ocupación real.
- **Reglas de negocio clave:** La ocupación/liberación es atómica y no puede revertirse manualmente mientras haya internación activa.
- **RBAC:** Automático.

---

## Módulo 5 — Historia clínica

### CU-10 Listado y búsqueda de HC (Todos / Activos / Alta / Ambulatorio)
- **Módulo:** Historia clínica
- **Actor(es):** ADMIN, MEDICO, ENFERMERO, ANESTESIOLOGO, INSTRUMENTADOR
- **Precondiciones:** Sesión con rol clínico.
- **Flujo principal:**
  1. El usuario abre `/historia-clinica` y busca por nombre o DNI.
  2. Filtra por contexto: Todos / Activos / Alta / Ambulatorio.
  3. El sistema muestra el contexto del paciente (AMBULATORIO/INTERNADO/ALTA) agregando la última internación o último turno.
  4. El usuario abre el expediente de la internación o la última consulta ambulatoria.
- **Flujos alternativos / errores:**
  - Paciente sin HC → el sistema la crea al abrir el expediente (HC nueva por paciente + episodio).
  - Paciente sin acceso para el rol → no aparece (visibilidad por rol).
- **Postcondiciones:** Expediente abierto con navegación por secciones (anamnesis, evolución, prescripciones, enfermería, preanestesia, protocolos, epicrisis, imprimir).
- **Reglas de negocio clave:** La visibilidad de HC está acotada por rol (MEDICO solo sus pacientes; ANESTESIOLOGO/INSTRUMENTADOR vía cirugía; ENFERMERO activos).
- **RBAC:** Ver HC: ADMIN, MEDICO, ENFERMERO, ANESTESIOLOGO, INSTRUMENTADOR (algunos endpoints suman FACTURACION/ADMISION).

### CU-11 Anamnesis y firma
- **Módulo:** Historia clínica
- **Actor(es):** ADMIN, MEDICO, ANESTESIOLOGO
- **Precondiciones:** Internación ACTIVA (episodio INTERNACION EN_CURSO). Paciente visible para el actor.
- **Flujo principal:**
  1. El usuario abre `/historia-clinica/[id]/anamnesis`.
  2. Completa: motivo de consulta, enfermedad actual, antecedentes, examen físico por aparatos, diagnóstico presuntivo/diferencial, plan de evaluación y terapéutico.
  3. Guarda (upsert por episodio).
  4. Opcional: firma → queda registrado `firmadoAt`/`firmadoPor`.
- **Flujos alternativos / errores:**
  - Edición posterior: se actualiza la misma anamnesis del episodio.
- **Postcondiciones:** Anamnesis disponible en la carpeta y en la impresión.
- **Reglas de negocio clave:** Una anamnesis por episodio.
- **RBAC:** Escribir/firmar: ADMIN/MEDICO/ANESTESIOLOGO.

### CU-12 Evoluciones
- **Módulo:** Historia clínica
- **Actor(es):** ADMIN, MEDICO, ENFERMERO, ANESTESIOLOGO
- **Precondiciones:** Episodio EN_CURSO.
- **Flujo principal:**
  1. El usuario abre `/historia-clinica/[id]/evolucion` y elige "Nueva Nota" (editor con entrada por voz).
  2. Redacta y guarda; queda pendiente de firma (firmada = false) o firma directamente.
- **Flujos alternativos / errores:**
  - Nota sin firmar → visible con estado "sin firmar" en el listado.
- **Postcondiciones:** Nota registrada en el expediente y la carpeta imprimible.
- **Reglas de negocio clave:** — 
- **RBAC:** Escribir: ADMIN/MEDICO/ENFERMERO/ANESTESIOLOGO.

### CU-13 Alta médica
- **Módulo:** Historia clínica / internaciones
- **Actor(es):** ADMIN, MEDICO
- **Precondiciones:** Internación ACTIVA (o POSTQUIRURGICO). Paciente visible para el actor.
- **Flujo principal:**
  1. Desde el panel médico o el expediente, el usuario elige "Alta Médica".
  2. Confirma en el modal.
  3. El sistema valida estado (solo ACTIVA/POSTQUIRURGICO), pasa la internación a ALTA_MEDICA con `fechaEgreso`, y libera la cama atómicamente.
- **Flujos alternativos / errores:**
  - Internación ya ALTA/FACTURADA/FALLECIDO → rechazo.
  - Camino alternativo: firma de **epicrisis** (CU-14) que también produce ALTA_MEDICA y deja la cama en EN_LIMPIEZA.
- **Postcondiciones:** Internación ALTA_MEDICA; cama disponible; la internación sale de las listas de activos (ENFERMERO/ADMISION/FACTURACION no la ven).
- **Reglas de negocio clave:** El alta es terminal (no reversible desde la UI).
- **RBAC:** ADMIN/MEDICO.

### CU-14 Epicrisis con firma (alta con documentación)
- **Módulo:** Historia clínica
- **Actor(es):** ADMIN, MEDICO
- **Precondiciones:** Internación ACTIVA.
- **Flujo principal:**
  1. El usuario abre `/historia-clinica/[id]/epicrisis`.
  2. Completa: diagnósticos de ingreso/egreso, códigos CIE, resumen clínico, estudios, tratamientos, condición de egreso (MEJORADO/CURADO/SIN_CAMBIOS/DERIVADO/FALLECIDO), destino (DOMICILIO/INT_DOMICILIARIA/OTRO_EFECTOR/UTI), medicación al alta, controles futuros.
  3. Guarda (upsert) y firma.
  4. El sistema transiciona: episodio FINALIZADO + internación ALTA_MEDICA + cama EN_LIMPIEZA + registra la firma (FirmaDocumento).
- **Flujos alternativos / errores:**
  - Epicrisis ya firmada → bloqueada para edición.
  - Condición FALLECIDO → internación pasa a estado FALLECIDO.
- **Postcondiciones:** Alta documentada; internación fuera de los listados activos.
- **Reglas de negocio clave:** La firma de epicrisis dispara el alta automáticamente (flujo clínico formal).
- **RBAC:** Escribir/firmar: ADMIN/MEDICO. Leer: + ENFERMERO, INSTRUMENTADOR.

### CU-15 Interconsultas
- **Módulo:** Historia clínica
- **Actor(es):** ADMIN, MEDICO
- **Precondiciones:** Episodio visible para el actor.
- **Flujo principal:**
  1. El usuario solicita una interconsulta a un especialista.
  2. Estado inicial SOLICITADA; el especialista responde → RESPONDIDA; o se cancela → CANCELADA.
- **Flujos alternativos / errores:**
  - Especialista no visible para el actor → rechazo.
- **Postcondiciones:** Interconsulta registrada en el expediente.
- **Reglas de negocio clave:** Se valida la especialidad del especialista y la visibilidad del episodio.
- **RBAC:** ADMIN/MEDICO.

---

## Módulo 6 — Enfermería

### CU-16 Registrar controles (signos vitales y otros) con alertas de rango
- **Módulo:** Enfermería
- **Actor(es):** ADMIN, ENFERMERO
- **Precondiciones:** Internación ACTIVA visible.
- **Flujo principal:**
  1. El usuario abre `/enfermeria` (lista de pacientes o mapa de camas) y elige "Controles" para un paciente.
  2. Registra por tipo: SIGNOS_VITALES, BALANCE_LIQUIDOS, GLUCEMIA, PESO, MONITOREO_RESP, CURACION o NOTA_LIBRE.
  3. Opcional: dictado por voz con parseo IA de signos vitales y confirmación manual.
  4. El sistema compara contra los rangos vitales configurados y emite alertas (PA, FC, FR, T°, SpO2).
  5. El control queda en la hoja de enfermería y en la carpeta imprimible.
- **Flujos alternativos / errores:**
  - Valor fuera de rango → alerta visible (últimos controles con alertas de rango vital).
  - Seguimiento Aldrete en pacientes postquirúrgicos.
- **Postcondiciones:** Control registrado con alertas; KPIs de enfermería actualizados.
- **Reglas de negocio clave:** Los rangos vitales se configuran en `/configuracion/admin` (tab Rangos vitales) por parámetro único (min/max).
- **RBAC:** Escribir: ADMIN/ENFERMERO (parseo IA: ADMIN/ENFERMERO). Leer: roles con acceso a HC.

### CU-17 Aplicar medicación de una prescripción
- **Módulo:** Enfermería / prescripciones
- **Actor(es):** ADMIN, ENFERMERO, MEDICO, ANESTESIOLOGO
- **Precondiciones:** Prescripción ACTIVA (MEDICACION) con ítem de stock asociado. Stock suficiente.
- **Flujo principal:**
  1. El enfermero abre el paciente en `/enfermeria` y ve "Indicaciones nuevas" / prescripciones pendientes.
  2. Aplica la medicación (cantidad, vía, horario).
  3. El sistema: descuenta stock del ítem, registra la aplicación (fecha/hora/enfermero), genera el cargo de facturación MEDICACION y marca la notificación de "nueva indicación" como leída.
- **Flujos alternativos / errores:**
  - Stock insuficiente → rechazo con detalle (no se descuenta).
  - Aplicar fuera de la prescripción → opción de medicación ad-hoc (CU-18).
- **Postcondiciones:** Aplicación registrada, stock descontado, cargo generado, notificación resuelta.
- **Reglas de negocio clave:** Cada aplicación descuenta stock y genera cargo MED (medicamentos) automáticamente.
- **RBAC:** Aplicar: ADMIN/ENFERMERO/MEDICO/ANESTESIOLOGO.

### CU-18 Medicación ad-hoc (sin prescripción)
- **Módulo:** Enfermería
- **Actor(es):** ADMIN, ENFERMERO, MEDICO, ANESTESIOLOGO
- **Precondiciones:** Paciente internado ACTIVO.
- **Flujo principal:**
  1. El usuario elige "Medicación ad-hoc" en la vista de enfermería.
  2. Selecciona el ítem de stock, cantidad y motivo (≥ 3 caracteres).
  3. El sistema chequea alergia del paciente contra la droga.
  4. Descuenta stock y genera cargo MEDICACION.
- **Flujos alternativos / errores:**
  - Alergia detectada → rechazo del cargo (misma lógica de bloqueo por alergia).
  - Motivo muy corto → 400.
  - Stock insuficiente → rechazo.
- **Postcondiciones:** Medicación aplicada sin prescripción, con trazabilidad de motivo.
- **Reglas de negocio clave:** Toda medicación (con o sin prescripción) pasa por el control de alergia y descuenta stock.
- **RBAC:** ADMIN/ENFERMERO/MEDICO/ANESTESIOLOGO.

### CU-19 Prescripciones y bloqueo por alergia
- **Módulo:** Enfermería / prescripciones (HC)
- **Actor(es):** ADMIN, MEDICO, ANESTESIOLOGO (crear); lectura amplia
- **Precondiciones:** Episodio EN_CURSO.
- **Flujo principal:**
  1. El usuario abre `/historia-clinica/[id]/prescripciones` → "Nueva Prescripción".
  2. Elige tipo (MEDICACION, DIETA, ESTUDIO, PRACTICA, ACTIVIDAD, OTRA) y completa el ítem (droga/dosis/frecuencia/vía para medicación; búsqueda en stock).
  3. El sistema verifica alergias de la droga contra el paciente (endpoint de verificación).
  4. Sin alergia → prescripción ACTIVA y se genera notificación a enfermería.
- **Flujos alternativos / errores:**
  - Alergia detectada → la prescripción se crea en estado **BLOQUEADA_ALERGIA** (no aplicable) con alerta visible.
  - El usuario puede suspender (SUSPENDIDA) o la prescripción se completa al aplicarse (COMPLETADA).
- **Postcondiciones:** Prescripción activa y notificación de nueva indicación; o bloqueada con alerta de alergia.
- **Reglas de negocio clave:** El bloqueo por alergia es automático y registrado; los medicamentos se buscan en el stock real de farmacia.
- **RBAC:** Crear: ADMIN/MEDICO/ANESTESIOLOGO. Leer: ADMIN, MEDICO, ENFERMERO, ANESTESIOLOGO, INSTRUMENTADOR. Verificar alergia: roles de lectura de HC.

---

## Módulo 7 — Quirófano y libro quirúrgico

### CU-20 Programar cirugía
- **Módulo:** Quirófano
- **Actor(es):** ADMIN, MEDICO
- **Precondiciones:** Internación ACTIVA sin cirugía PROGRAMADA/EN_CURSO. Quirófano disponible. Paciente visible para el actor.
- **Flujo principal:**
  1. El usuario abre `/quirofano` → "Programar cirugía" (o desde el expediente HC "Programar cirugía").
  2. Elige fecha, hora, quirófano, tipo (PROGRAMADA/URGENCIA/EMERGENCIA), cirujano, ayudantes, anestesiólogo, instrumentador, circulante, procedimiento y diagnóstico preoperatorio.
  3. El sistema crea la cirugía en estado PROGRAMADA.
  4. Aparece en la agenda quirúrgica del día y en la sección "Pacientes disponibles para programar".
- **Flujos alternativos / errores:**
  - MEDICO que no ve la internación → rechazo.
  - Internación ya con cirugía PROGRAMADA/EN_CURSO → no aparece como disponible.
- **Postcondiciones:** Cirugía programada; el libro operatorio se puede abrir desde la card del quirófano.
- **Reglas de negocio clave:** 1 internación = 1 cirugía activa (programada/en curso).
- **RBAC:** Crear: ADMIN/MEDICO (MEDICO solo si ve la internación). Leer: ADMIN, MEDICO, ANESTESIOLOGO, INSTRUMENTADOR, CIRCULANTE (no-ADMIN solo las suyas).

### CU-21 Libro quirúrgico (registro intraoperatorio con RBAC por campo)
- **Módulo:** Quirófano
- **Actor(es):** ADMIN, MEDICO (cirujano/ayudantes), ANESTESIOLOGO, INSTRUMENTADOR, CIRCULANTE
- **Precondiciones:** Cirugía PROGRAMADA/EN_CURSO. Rol efectivo resuelto por la asignación en la cirugía.
- **Flujo principal:**
  1. El usuario abre `/quirofano/[cirugiaId]/libro`.
  2. Según su rol efectivo, edita los campos permitidos del libro:
     - **MEDICO** (cirujano/ayudante): equipo, fechas, diagnóstico pre/postoperatorio, procedimiento, hallazgos, evolución postoperatoria, indicaciones, datos de parto/cesárea.
     - **ANESTESIOLOGO**: signos vitales intraoperatorios, observaciones de anestesia, score ASA.
     - **INSTRUMENTADOR / CIRCULANTE**: hora de inicio/fin, arco C, ARM, ecógrafo, muestras patológicas/bacteriológicas, balances, posición operatoria, sondas, diuresis intraop, sangre perdida.
     - **ADMIN**: todos los campos.
  3. El sistema sincroniza el estado de la internación (ACTIVA → EN_QUIROFANO → POSTQUIRURGICO según el flujo del libro).
  4. Opcional: cerrar la cirugía (estado COMPLETADA) — solo ADMIN/MEDICO.
- **Flujos alternativos / errores:**
  - Campo no permitido para el rol → rechazo (whitelist por campo).
  - Parte quirúrgico estricto: solo MEDICO puede editar ciertos campos del protocolo quirúrgico.
- **Postcondiciones:** Libro actualizado; estado de internación sincronizado; cargos y stock según registros.
- **Reglas de negocio clave:** RBAC fino por campo con rol efectivo de la cirugía (no el rol de sesión). `STRICT_PROTOCOLO_ANESTESIA` / `STRICT_PARTE_QUIRURGICO` endurecen la edición.
- **RBAC:** Ver mapa `EDITABLE_BY_ROLE` (cuadro anterior). Cerrar cirugía: ADMIN/MEDICO. Reprogramar: ADMIN.

### CU-22 Medicamentos, implantes y prácticas en quirófano
- **Módulo:** Quirófano
- **Actor(es):** ADMIN, ENFERMERO, INSTRUMENTADOR
- **Precondiciones:** Cirugía EN_CURSO/PROGRAMADA con acceso.
- **Flujo principal:**
  1. **Medicamentos/materiales:** el usuario registra ítem con cantidad; el sistema valida stock (disponible), descuenta, crea movimiento EGRESO y cargo DESCARTABLE.
  2. **Implantes:** registra implante (código, nombre, lote, modelo, lado, código CE); solo asignados a la cirugía o ADMIN.
  3. **Prácticas:** registra práctica quirúrgica; el sistema calcula honorarios/gastos con el galeno de la OS y crea cargo PRACTICA (rubro HON).
- **Flujos alternativos / errores:**
  - Stock insuficiente → rechazo: "Stock insuficiente (disp: …)".
  - Quitar un medicamento registrado → se repone el stock (DELETE).
- **Postcondiciones:** Stock descontado/repuesto; cargos de facturación generados (DESCARTABLE → GAS, PRACTICA → HON).
- **Reglas de negocio clave:** Todo registro de medicamento en quirófano impacta stock y facturación en una sola operación.
- **RBAC:** ADMIN/ENFERMERO/INSTRUMENTADOR.

### CU-23 Plantillas de protocolo quirúrgico
- **Módulo:** Quirófano
- **Actor(es):** ADMIN, MEDICO, ANESTESIOLOGO
- **Precondiciones:** Sesión con rol permitido.
- **Flujo principal:**
  1. El usuario abre `/plantillas` → crear/importar/editar/eliminar plantillas.
  2. Las plantillas son personales (upsert por nombre del médico).
- **Flujos alternativos / errores:**
  - Nombre duplicado → 409.
  - Editar/eliminar plantilla ajena → rechazo (solo propias).
- **Postcondiciones:** Plantilla disponible para reutilizar en protocolos.
- **Reglas de negocio clave:** Plantillas por médico (unique médico+nombre).
- **RBAC:** ADMIN/MEDICO/ANESTESIOLOGO.

---

## Módulo 8 — Protocolo de anestesia

### CU-24 Valoración preanestésica y firma
- **Módulo:** Anestesia
- **Actor(es):** ADMIN, MEDICO, ANESTESIOLOGO
- **Precondiciones:** Episodio INTERNACION EN_CURSO; cirugía programada opcionalmente.
- **Flujo principal:**
  1. El usuario abre `/historia-clinica/[id]/preanestesia`.
  2. Completa: peso, talla, antecedentes por sistemas, examen físico, score ASA, anestesia sugerida, comentarios.
  3. Guarda (upsert por episodio) y firma (registra anestesiólogo y `firmadaAt`).
- **Flujos alternativos / errores:**
  - Episodio no INTERNACION → rechazo.
- **Postcondiciones:** Valoración disponible para el protocolo y la carpeta.
- **Reglas de negocio clave:** Una valoración por episodio.
- **RBAC:** Escribir: ADMIN/MEDICO/ANESTESIOLOGO.

### CU-25 Protocolo de anestesia intraoperatorio y firma
- **Módulo:** Anestesia
- **Actor(es):** ADMIN, ANESTESIOLOGO
- **Precondiciones:** Episodio INTERNACION EN_CURSO. (Modo estricto: solo ANESTESIOLOGO edita.)
- **Flujo principal:**
  1. El usuario abre `/historia-clinica/[id]/protocolo-anestesia`.
  2. Registra: evaluación preanestésica (alergia, ASA, ayuno, mallampati, checklist), técnica (técnicas, tipo, bloqueos, vía de inducción, manejo de vía aérea), registro (drogas con categoría/dosis/vía/hora, signos vitales), balance (líquidos, diuresis, pérdida sanguínea), recuperación (estado de egreso, destino, Aldrete por 5 ítems). Los datos del equipo quirúrgico y drogas pueden precargarse desde la cirugía.
  3. Guarda (upsert).
  4. Firma → queda bloqueado para edición (`firmado = true`, `firmadoEn`, `firmadoPor`); firma registrada como FirmaDocumento.
- **Flujos alternativos / errores:**
  - Protocolo ya firmado → intento de edición rechazado (409).
  - ANESTESIOLOGO intenta firmar como otro rol → rechazo si no es ADMIN/ANESTESIOLOGO.
- **Postcondiciones:** Protocolo firmado e inmutable, incluido en la carpeta imprimible.
- **Reglas de negocio clave:** `STRICT_PROTOCOLO_ANESTESIA = true`: solo el anestesiólogo (o ADMIN) edita/firma. La firma es definitiva.
- **RBAC:** Escribir/firmar: ADMIN/ANESTESIOLOGO. Ver: roles clínicos con acceso a HC.

---

## Módulo 9 — Consultorio / turnos / horarios

### CU-26 Horarios de consultorio del médico
- **Módulo:** Consultorio
- **Actor(es):** ADMIN, MEDICO
- **Precondiciones:** Sesión MEDICO/ADMIN.
- **Flujo principal:**
  1. El médico abre `/consultorio` → tab "Horarios".
  2. Define/edita horarios: día (LUNES…DOMINGO), hora inicio/fin, intervalo (default 30 min), activo.
- **Flujos alternativos / errores:**
  - Horario inactivo → no genera turnos.
- **Postcondiciones:** Los turnos disponibles de la agenda se generan según los horarios activos.
- **Reglas de negocio clave:** Los horarios son por médico.
- **RBAC:** Escribir: ADMIN/MEDICO. Leer: ADMIN, MEDICO, SECRETARIA.

### CU-27 Agendar turno (secretaría)
- **Módulo:** Consultorio / turnos
- **Actor(es):** ADMIN, SECRETARIA
- **Precondiciones:** Paciente existente. Horarios activos del médico. La secretaria debe estar asignada al médico (SecretariaMedico) — o ser ADMIN.
- **Flujo principal:**
  1. La secretaria abre `/consultorio` y busca el paciente.
  2. "Agendar turno" → elige médico, fecha, hora, OS, motivo.
  3. El turno queda PENDIENTE y aparece en la agenda del día.
- **Flujos alternativos / errores:**
  - Secretaria sin asignación al médico → no puede agendarle turnos (solo ve/agenda médicos asignados).
  - Horario no disponible → el slot no se ofrece.
- **Postcondiciones:** Turno en agenda; visible para el médico en "Mi agenda del día".
- **Reglas de negocio clave:** Asignación secretaria↔médico gestionada por ADMIN (`/configuracion/asignar-secretaria-consultorio`).
- **RBAC:** Crear/actualizar: ADMIN/SECRETARIA. Leer: ADMIN, SECRETARIA, MEDICO.

### CU-28 Ciclo del turno: confirmar → consulta → completar/cancelar
- **Módulo:** Consultorio
- **Actor(es):** ADMIN, SECRETARIA (confirmar/cancelar/no asistió), ADMIN, MEDICO (iniciar/finalizar consulta)
- **Precondiciones:** Turno PENDIENTE/CONFIRMADO.
- **Flujo principal:**
  1. Secretaría confirma el turno (CONFIRMADO) o lo cancela (CANCELADO); si el paciente no concurre → NO_ASISTIO.
  2. El médico abre el turno y "Inicia consulta" → EN_CONSULTA; se crea el episodio CONSULTA de la HC.
  3. El médico trabaja en la consulta (anamnesis, evolución, prescripciones, interconsultas) y la finaliza → COMPLETADO.
- **Flujos alternativos / errores:**
  - Turno en estado incorrecto para la acción → rechazo.
- **Postcondiciones:** Turno COMPLETADO con episodio CONSULTA FINALIZADO; opcional: "Imprimir receta" (PDF).
- **Reglas de negocio clave:** El inicio de consulta genera el episodio ambulatorio; la HC ambulatoria alimenta el listado de HC (contexto Ambulatorio).
- **RBAC:** Iniciar/finalizar consulta: ADMIN/MEDICO. Actualizar turno: ADMIN, SECRETARIA, MEDICO.

---

## Módulo 10 — Farmacia

### CU-29 Alta de medicamento (troquel, precios, fracción)
- **Módulo:** Farmacia
- **Actor(es):** ADMIN
- **Precondiciones:** Sesión ADMIN.
- **Flujo principal:**
  1. El usuario abre `/farmacia` → "Nuevo medicamento".
  2. Carga: nombre, n.º de troquel, principio activo, presentación, laboratorio, unidad, stock actual/mínimo/máximo, lote, vencimiento, ubicación, precios de compra/venta, fracción.
  3. El ítem queda activo y disponible para búsqueda por troquel/nombre/presentación/laboratorio.
- **Flujos alternativos / errores:**
  - Datos inválidos → 400.
- **Postcondiciones:** Ítem en stock; usable en prescripciones, ad-hoc y quirófano; puede desactivarse (editar/desactivar solo ADMIN).
- **Reglas de negocio clave:** El troquel es la identificación clave; `fraccion` permite medición fraccionada.
- **RBAC:** Crear/editar/desactivar ítems: solo ADMIN. Ver stock y movimientos: ADMIN/FARMACIA.

### CU-30 Movimientos de stock (ingreso/egreso/ajuste)
- **Módulo:** Farmacia
- **Actor(es):** ADMIN, FARMACIA
- **Precondiciones:** Ítem existente y activo.
- **Flujo principal:**
  1. El usuario abre el ítem → "Movimiento".
  2. Registra INGRESO (compra/reposición), EGRESO (consumo/derivación) o AJUSTE (corrección de inventario), con cantidad y motivo.
  3. El sistema actualiza `stockActual` y registra el movimiento (tipo, cantidad, motivo, usuario, referencia a internación/cirugía si aplica).
- **Flujos alternativos / errores:**
  - EGRESO mayor al stock actual → rechazo (no se descuenta).
  - Cantidad no válida → 400.
  - Los egresos por aplicación de medicación/ad-hoc/quirófano son automáticos (CU-17, CU-18, CU-22) y no manuales.
- **Postcondiciones:** Stock actualizado; movimientos trazables; alertas de stock bajo (`stockActual < stockMinimo`) y por vencer en KPIs.
- **Reglas de negocio clave:** Todo cambio de stock queda registrado con motivo y usuario. El tipo VENCIMIENTO existe para bajas por vencimiento.
- **RBAC:** ADMIN/FARMACIA (búsqueda de stock para prescripciones: ADMIN, FARMACIA, ENFERMERO, INSTRUMENTADOR, MEDICO, ANESTESIOLOGO).

---

## Módulo 11 — Obras sociales

### CU-31 Alta/edición de obra social y coberturas
- **Módulo:** Obras sociales
- **Actor(es):** ADMIN
- **Precondiciones:** Sesión ADMIN.
- **Flujo principal:**
  1. El usuario abre `/configuracion/admin` → tab "Obras sociales".
  2. Crea/edita: código (único), nombre, sigla, razón social, CUIT, tipo de contribución (INSCRIPTO/NO_INSCRIPTO/EXENTO/MONOTRIBUTO/CONSUMIDOR_FINAL), tipo IVA (0/10,5/21), estado ambulatorio y estado internación (ACTIVA/SUSPENDIDA), % descuento de medicamentos.
  3. Activa/desactiva la OS.
- **Flujos alternativos / errores:**
  - Código duplicado → 409.
- **Postcondiciones:** La OS participa en admisión (internación), turnos (ambulatorio) y facturación.
- **Reglas de negocio clave:** Cobertura ambulatoria e internación se controlan por separado; una OS suspendida para internación no puede admitir pacientes (CU-05), aunque pueda tener turnos si el ambulatorio está ACTIVA.
- **RBAC:** Crear/editar: ADMIN. Leer: ADMIN, MEDICO, ENFERMERO, ANESTESIOLOGO, INSTRUMENTADOR, FACTURACION, ADMISION.

---

## Módulo 12 — Nomenclador

### CU-32 Importar nomenclador nacional (CSV)
- **Módulo:** Nomenclador
- **Actor(es):** ADMIN
- **Precondiciones:** Sesión ADMIN; archivo CSV del nomenclador nacional.
- **Flujo principal:**
  1. El usuario abre `/configuracion/nomencladores` → tab "Importar".
  2. Sube el CSV; el sistema actualiza por código y genera un reporte de creados/actualizados/errores.
- **Flujos alternativos / errores:**
  - Fila con datos inválidos → error por fila en el reporte (no aborta el lote).
- **Postcondiciones:** Nomenclador nacional actualizado (base para copias por OS).
- **Reglas de negocio clave:** Actualización por código; ~2095 prácticas en el nomenclador nacional.
- **RBAC:** ADMIN.

### CU-33 Copia del nomenclador por OS + práctica propia + sincronizar
- **Módulo:** Nomenclador
- **Actor(es):** ADMIN
- **Precondiciones:** OS existente; nomenclador nacional cargado.
- **Flujo principal:**
  1. El usuario abre el tab "Por obra social" y selecciona la OS.
  2. "Crear copia del nomenclador nacional" → se copian las prácticas (origen COPIA_NACIONAL).
  3. "Sincronizar nuevas del nacional" → agrega solo los ítems faltantes de la copia (no pisa valores propios).
  4. "Agregar práctica propia" → práctica específica de la OS (origen PROPIA_OS) con unidades propias.
  5. Edita en línea: unidades (esp/ayud/anest/gastos) e importes fijos; activa/desactiva prácticas.
- **Flujos alternativos / errores:**
  - Práctica sin copia previa → sincronizar la incorpora.
  - Desactivar práctica → no se ofrece al facturar.
- **Postcondiciones:** La copia es la fuente de la facturación de esa OS (unidades o importes fijos).
- **Reglas de negocio clave:** La copia NO se re-sincroniza automáticamente; sincronizar solo agrega faltantes. Las específicas nacionales (ESPECIFICA) son aparte.
- **RBAC:** Copiar/sincronizar/editar: ADMIN. Leer: ADMIN/FACTURACION.

### CU-34 Importes en $ por práctica (fijo o calculado con galeno)
- **Módulo:** Nomenclador / facturación
- **Actor(es):** ADMIN (configurar), FACTURACION (consumir)
- **Precondiciones:** Copia por OS creada; galeno vigente de la OS (para cálculos).
- **Flujo principal:**
  1. En la copia por OS, el sistema muestra para cada práctica las columnas U. y $ por rubro (Esp, Ayud, Anest, Gastos).
  2. Sin fijo cargado → el $ se calcula en vivo: unidades × galeno vigente (badge CALC).
  3. Con fijo cargado → se usa el fijo pactado (badge FIJO); si se borra, vuelve a calculado.
  4. El header muestra el galeno vigente (Qx y gastos).
- **Flujos alternativos / errores:**
  - Sin galeno vigente → los calculados no están disponibles (el fijo sí aplica).
- **Postcondiciones:** La facturación resuelve el importe correcto por práctica (CU-35/36).
- **Reglas de negocio clave:** `importe = fijo ?? unidades × galeno`. Los fijos existen solo en la copia por OS; los calculados no se persisten.
- **RBAC:** Configurar: ADMIN. Consumir: ADMIN/FACTURACION.

---

## Módulo 13 — Galenos por OS

### CU-35 Alta y vigencia de galeno por obra social
- **Módulo:** Galenos
- **Actor(es):** ADMIN
- **Precondiciones:** OS existente.
- **Flujo principal:**
  1. El usuario abre `/configuracion/galenos` → "Nuevo galeno".
  2. Carga: OS, galeno Qx, gastos Qx, gastos pensión, otros gastos, índice de medicación, vigencia desde/hasta, activo.
  3. Edita o activa/desactiva galenos.
- **Flujos alternativos / errores:**
  - Vigencia vencida o sin vigente → los cálculos automáticos no aplican (solo fijos).
- **Postcondiciones:** El galeno vigente de la OS alimenta el cálculo de honorarios/gastos (unidades × galeno) en facturación y quirófano.
- **Reglas de negocio clave:** Se usa el galeno vigente según fecha (vigenciaDesde/vigenciaHasta); el cálculo CALCULADO exige galeno vigente con Qx > 0.
- **RBAC:** Editar: ADMIN. Leer: ADMIN/FACTURACION.

---

## Módulo 14 — Facturación

### CU-36 Liquidación por paciente con filtros
- **Módulo:** Facturación
- **Actor(es):** ADMIN, FACTURACION
- **Precondiciones:** Cargos generados en la internación (medicación, prácticas, quirófano, anestesia, cama, materiales…).
- **Flujo principal:**
  1. El usuario abre `/facturacion`.
  2. Filtra por obra social, período (mes/año), estado (Pendiente/Parcial/Facturado) y busca por apellido/DNI.
  3. Expande la liquidación del paciente y ve los rubros con sus cargos.
  4. Agrega/edita cargos según rubro (CU-37) y cierra la liquidación.
- **Flujos alternativos / errores:**
  - Sin cargos → no aparece en la lista.
  - Paciente no visible → no aparece (ámbito por rol).
- **Postcondiciones:** Liquidación por internación con totales; puede marcarse facturada (estado FACTURADA).
- **Reglas de negocio clave:** Los rubros son: **KIN** (kinesiología), **BIO** (bioquímica/laboratorio), **GAS** (gastos: cama, materiales, descartables), **HON** (honorarios: prácticas y actos médicos), **MED** (medicamentos). Origen de cargo → rubro: MEDICACION→MED, CAMA/MATERIAL/DESCARTABLE/OTRO→GAS, PRACTICA/QUIROFANO/ANESTESIA/GUARDIA→HON, ESTUDIO→BIO, KIN→KIN.
- **RBAC:** ADMIN/FACTURACION.

### CU-37 Cargos por función (10/20/30/60/91/92)
- **Módulo:** Facturación
- **Actor(es):** ADMIN, FACTURACION
- **Precondiciones:** Internación con datos de OS; galeno o fijos según el caso.
- **Flujo principal:**
  1. En el rubro correspondiente, el usuario agrega un cargo:
     - **HON 10** (honorario especialista), **HON 20** (ayudante), **HON 30** (anestesista): se elige la práctica del nomenclador por OS; el sistema resuelve el importe = fijo de la OS **o** unidades × galeno vigente (CALCULADO); con origen FIJO no requiere galeno.
     - **HON 91**: honorario manual (valor base cargado a mano).
     - **GAS 60** (gastos): práctica con gastos × galeno de gastos, o fijo de gastos; **GAS 92**: importe manual.
     - **MED**: medicación del stock con cantidad (precio del ítem); también se auto-genera al aplicar medicación.
  2. El cargo se registra con concepto, cantidad, precio unitario, total, origen, fecha y detalle (galeno aplicado, nomenclador, aplicación).
- **Flujos alternativos / errores:**
  - Sin galeno vigente y sin fijo → el calculado no está disponible (se advierte).
  - Práctica desactivada o inexistente en la copia → no seleccionable.
  - Stock insuficiente en MED → rechazo.
- **Postcondiciones:** Cargo con importe resuelto en la liquidación; totales recalculados.
- **Reglas de negocio clave:** Funciones: 10/20/30 (honorarios por rubro de práctica), 60 (gastos), 91/92 (manuales). Resolución: `fijo ?? unidades × galeno`; origen FIJO no exige galeno; CALCULADO exige galeno vigente.
- **RBAC:** ADMIN/FACTURACION.

---

## Módulo 15 — Impresión de carpeta HC

### CU-38 Carpeta completa imprimible
- **Módulo:** Historia clínica / impresión
- **Actor(es):** ADMIN, MEDICO, ANESTESIOLOGO, INSTRUMENTADOR, CIRCULANTE
- **Precondiciones:** Expediente con contenido (anamnesis, evoluciones, prescripciones, enfermería, preanestesia, protocolos, epicrisis).
- **Flujo principal:**
  1. Desde el expediente, el usuario elige "Imprimir carpeta" o abre `/historia-clinica/[id]/imprimir`.
  2. Selecciona las secciones a incluir (checkboxes "Todas"/"Ninguna").
  3. El sistema arma el HTML imprimible con membrete y todas las secciones clínicas; el usuario imprime/guarda PDF.
- **Flujos alternativos / errores:**
  - Secciones vacías → se omiten o figuran sin contenido.
- **Postcondiciones:** Carpeta impresa para archivo, derivación o auditoría.
- **Reglas de negocio clave:** La carpeta incluye: anamnesis, evoluciones, prescripciones, aplicaciones de medicación, hoja de enfermería, controles, preanestesia, protocolo de anestesia (drogas), protocolo quirúrgico, epicrisis, cargos e interconsultas.
- **RBAC:** Roles clínicos listados; el detalle puede exigir visibilidad del paciente.

---

## Módulo 16 — Configuración / usuarios / ABMs

### CU-39 Gestión de usuarios
- **Módulo:** Configuración
- **Actor(es):** ADMIN
- **Precondiciones:** Sesión ADMIN.
- **Flujo principal:**
  1. El usuario abre `/configuracion/usuarios`.
  2. "Nuevo usuario": nombre, apellido, email, contraseña, rol (los 9 roles), matrícula y especialidad (para médicos/anestesiólogos).
  3. Edita o desactiva usuarios; el listado muestra badges de rol.
- **Flujos alternativos / errores:**
  - Email duplicado → 409.
  - Usuario inactivo → no inicia sesión.
- **Postcondiciones:** El usuario puede loguearse y opera con los permisos de su rol.
- **Reglas de negocio clave:** Solo ADMIN administra usuarios y roles.
- **RBAC:** ADMIN.

### CU-40 ABMs de sistema y asignaciones
- **Módulo:** Configuración
- **Actor(es):** ADMIN
- **Precondiciones:** Sesión ADMIN.
- **Flujo principal:**
  1. `/configuracion/admin` → tabs: Sectores (CRUD, sin borrar si tiene camas), Camas (alta con sector y tipo, sin borrar con internación activa), Obras sociales (CU-31), Quirófanos (CRUD, sin borrar si tiene cirugías), Rangos vitales (min/max por parámetro → alertas de enfermería).
  2. `/configuracion/asignar-tratante` → asigna médico tratante a internaciones activas sin tratante.
  3. `/configuracion/asignar-secretaria-consultorio` → asigna secretaria ↔ médico (la secretaria solo agenda a médicos asignados).
- **Flujos alternativos / errores:**
  - Borrado con dependencias (camas, cirugías) → bloqueado.
  - Quitar al único tratante → rechazo.
- **Postcondiciones:** Configuración aplicada en camas, turnos, alertas y facturación.
- **Reglas de negocio clave:** Los ABMs de configuración impactan en tiempo real en los módulos operativos.
- **RBAC:** ADMIN.

---

## Tabla resumen

| CU-ID | Módulo | Actor(es) | Nombre |
|-------|--------|-----------|--------|
| CU-01 | Auth | Todos | Login |
| CU-02 | Auth | Todos | Cierre de sesión |
| CU-03 | Dashboard | Todos | Dashboard operativo por rol |
| CU-04 | Admisión | ADMIN, ADMISION, SECRETARIA | Registrar paciente nuevo |
| CU-05 | Admisión | ADMIN, ADMISION | Admisión con internación (asignar cama) |
| CU-06 | Admisión | ADMIN, ADMISION | Paciente en espera de cama |
| CU-07 | Admisión | ADMIN, MEDICO, ANESTESIOLOGO | Gestión de alergias del paciente |
| CU-08 | Camas | ADMIN, ADMISION | Cambio de estado manual de cama |
| CU-09 | Camas | Sistema | Transiciones automáticas de cama por internación |
| CU-10 | HC | Roles clínicos | Listado y búsqueda de HC (Todos/Activos/Alta/Ambulatorio) |
| CU-11 | HC | ADMIN, MEDICO, ANESTESIOLOGO | Anamnesis y firma |
| CU-12 | HC | ADMIN, MEDICO, ENFERMERO, ANESTESIOLOGO | Evoluciones |
| CU-13 | HC | ADMIN, MEDICO | Alta médica |
| CU-14 | HC | ADMIN, MEDICO | Epicrisis con firma (alta documentada) |
| CU-15 | HC | ADMIN, MEDICO | Interconsultas |
| CU-16 | Enfermería | ADMIN, ENFERMERO | Registrar controles con alertas de rango |
| CU-17 | Enfermería | ADMIN, ENFERMERO, MEDICO, ANESTESIOLOGO | Aplicar medicación de prescripción |
| CU-18 | Enfermería | ADMIN, ENFERMERO, MEDICO, ANESTESIOLOGO | Medicación ad-hoc sin prescripción |
| CU-19 | Enfermería | ADMIN, MEDICO, ANESTESIOLOGO | Prescripciones y bloqueo por alergia |
| CU-20 | Quirófano | ADMIN, MEDICO | Programar cirugía |
| CU-21 | Quirófano | ADMIN, MEDICO, ANESTESIOLOGO, INSTRUMENTADOR, CIRCULANTE | Libro quirúrgico (RBAC por campo) |
| CU-22 | Quirófano | ADMIN, ENFERMERO, INSTRUMENTADOR | Medicamentos, implantes y prácticas en quirófano |
| CU-23 | Quirófano | ADMIN, MEDICO, ANESTESIOLOGO | Plantillas de protocolo quirúrgico |
| CU-24 | Anestesia | ADMIN, MEDICO, ANESTESIOLOGO | Valoración preanestésica y firma |
| CU-25 | Anestesia | ADMIN, ANESTESIOLOGO | Protocolo de anestesia intraoperatorio y firma |
| CU-26 | Consultorio | ADMIN, MEDICO | Horarios de consultorio del médico |
| CU-27 | Consultorio | ADMIN, SECRETARIA | Agendar turno (secretaría) |
| CU-28 | Consultorio | ADMIN, SECRETARIA, MEDICO | Ciclo del turno: confirmar → consulta → completar |
| CU-29 | Farmacia | ADMIN | Alta de medicamento (troquel, precios, fracción) |
| CU-30 | Farmacia | ADMIN, FARMACIA | Movimientos de stock (ingreso/egreso/ajuste) |
| CU-31 | Obras sociales | ADMIN | Alta/edición de OS y coberturas |
| CU-32 | Nomenclador | ADMIN | Importar nomenclador nacional (CSV) |
| CU-33 | Nomenclador | ADMIN | Copia por OS + práctica propia + sincronizar |
| CU-34 | Nomenclador | ADMIN, FACTURACION | Importes en $ por práctica (fijo o calculado) |
| CU-35 | Galenos | ADMIN | Alta y vigencia de galeno por OS |
| CU-36 | Facturación | ADMIN, FACTURACION | Liquidación por paciente con filtros |
| CU-37 | Facturación | ADMIN, FACTURACION | Cargos por función (10/20/30/60/91/92) |
| CU-38 | Impresión | ADMIN, MEDICO, ANESTESIOLOGO, INSTRUMENTADOR, CIRCULANTE | Carpeta completa imprimible |
| CU-39 | Configuración | ADMIN | Gestión de usuarios |
| CU-40 | Configuración | ADMIN | ABMs de sistema y asignaciones |