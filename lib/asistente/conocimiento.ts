/**
 * Base de conocimiento del asistente de uso del SIH.
 *
 * Describe CÓMO SE USA el sistema (pantallas, botones, permisos por rol), armada a partir de
 * docs/casos-de-uso-sih.md y de las pantallas reales de app/(dashboard). No contiene ni debe
 * contener contenido clínico: el asistente solo ayuda con el software.
 *
 * Las respuestas usan un markdown mínimo que renderiza components/asistente/AsistenteIA.tsx:
 * párrafos, listas "- " / "1. ", **negrita** y `/rutas` (se muestran como links).
 */

export interface TemaAyuda {
  id: string;
  /** Slug del módulo (mismo vocabulario que MODULOS) */
  modulo: string;
  titulo: string;
  /** Frases/palabras clave normalizadas (minúsculas, sin acentos). Las de varias palabras pesan más. */
  claves: string[];
  /** Prefijos de ruta donde el tema es más probable (suma puntaje) */
  rutas?: string[];
  /** Roles que pueden realizar la acción. Sin definir = cualquier rol autenticado. */
  roles?: string[];
  respuesta: string;
}

export interface ModuloInfo {
  label: string;
  ruta?: string;
}

/** Vocabulario de módulos: lo usan el motor, el modelo MejoraSugerida y el panel ADMIN. */
export const MODULOS: Record<string, ModuloInfo> = {
  dashboard: { label: "Inicio / dashboard", ruta: "/" },
  admision: { label: "Admisión", ruta: "/admision" },
  guardia: { label: "Guardia", ruta: "/guardia" },
  camas: { label: "Camas e internaciones", ruta: "/camas" },
  consultorio: { label: "Consultorio y turnos", ruta: "/consultorio" },
  "atencion-medica": { label: "Atención médica", ruta: "/atencion-medica" },
  "historia-clinica": { label: "Historia clínica", ruta: "/historia-clinica" },
  enfermeria: { label: "Enfermería", ruta: "/enfermeria" },
  quirofano: { label: "Quirófano", ruta: "/quirofano" },
  anestesia: { label: "Anestesia" },
  farmacia: { label: "Farmacia", ruta: "/farmacia" },
  facturacion: { label: "Facturación", ruta: "/facturacion" },
  configuracion: { label: "Configuración", ruta: "/configuracion" },
  general: { label: "General" },
};

export function moduloLabel(slug: string | null | undefined): string {
  if (!slug) return "Sin módulo";
  return MODULOS[slug]?.label ?? slug;
}

/** Módulo al que pertenece una ruta (las subpantallas de la HC se reparten por tema). */
export function moduloDeRuta(ruta: string | null | undefined): string | null {
  if (!ruta) return null;
  const segs = ruta.split("?")[0].split("/").filter(Boolean);
  if (segs.length === 0) return "dashboard";
  const [base] = segs;
  if (base === "historia-clinica") {
    if (segs.includes("preanestesia") || segs.includes("protocolo-anestesia")) return "anestesia";
    if (segs.includes("protocolo-quirurgico")) return "quirofano";
    if (segs.includes("enfermeria")) return "enfermeria";
    return "historia-clinica";
  }
  if (base === "panel-medico") return "historia-clinica";
  if (base === "plantillas") return "quirofano";
  return MODULOS[base] ? base : null;
}

const CLINICOS = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];

export const TEMAS: TemaAyuda[] = [
  // ───────────────────────── Admisión ─────────────────────────
  {
    id: "admision-paciente",
    modulo: "admision",
    titulo: "Admitir / internar un paciente",
    claves: ["admito", "admitir", "admision", "internar", "internacion nueva", "nueva internacion", "ingresar un paciente", "ingreso de paciente", "dar de alta un paciente nuevo", "registrar paciente", "paciente nuevo", "alta de paciente"],
    rutas: ["/admision"],
    roles: ["ADMIN", "ADMISION"],
    respuesta: `Para **admitir (internar) un paciente**:
1. Entrá a \`/admision\` y buscá al paciente por DNI o nombre.
2. Si no existe, registralo con el formulario de paciente nuevo (DNI, apellido, nombre, sexo, fecha de nacimiento, CUIL…). El DNI no puede repetirse.
3. Abrí su ficha y elegí **Nueva internación**.
4. Completá cama (desde el mapa), obra social, n.º de afiliado, tipo de beneficiario, médico(s) tratante(s), tipo de ingreso, motivo, peso y diagnóstico de ingreso.
5. Guardá: se crean la internación, la historia clínica y se ocupa la cama.

Si no hay cama libre, la internación queda **en espera** en \`/admision/espera\`. La obra social tiene que estar activa para internación.`,
  },
  {
    id: "admision-espera",
    modulo: "admision",
    titulo: "Pacientes en espera de cama",
    claves: ["espera", "en espera", "sin cama", "asignar cama", "esperando cama", "lista de espera"],
    rutas: ["/admision"],
    roles: ["ADMIN", "ADMISION"],
    respuesta: `Los pacientes internados **sin cama** aparecen en \`/admision/espera\`.
1. Cuando se libere una cama, abrí la ficha del paciente desde esa lista.
2. Asignale la cama: pasa a \`/admision/internados\` y al mapa de \`/camas\`.

Si la cama se ocupó mientras la elegías, el sistema te avisa y tenés que elegir otra.`,
  },
  {
    id: "admision-internados",
    modulo: "admision",
    titulo: "Ver los internados",
    claves: ["internados", "pacientes internados", "lista de internados", "quien esta internado"],
    rutas: ["/admision", "/atencion-medica"],
    respuesta: `- **Admisión** ve la lista completa en \`/admision/internados\`.
- **Médicos** ven a sus pacientes en \`/atencion-medica\`.
- **Enfermería** los ve en \`/enfermeria\` (lista o mapa de camas).
- El mapa general está en \`/camas\`.`,
  },
  {
    id: "alergias",
    modulo: "admision",
    titulo: "Registrar alergias",
    claves: ["alergia", "alergias", "alergico", "cargar alergia", "agregar alergia"],
    rutas: ["/admision", "/panel-medico", "/historia-clinica"],
    roles: ["ADMIN", "MEDICO", "ANESTESIOLOGO"],
    respuesta: `Las **alergias** se cargan en la sección **Alergias** de la ficha del paciente (\`/admision\` → ficha) o del **panel médico** de la internación.
- Cargá sustancia, severidad y una observación.
- No se pueden repetir sustancias.
- Se muestran en el encabezado de la HC y en todas sus subpantallas.

Las alergias **bloquean automáticamente** las prescripciones y la medicación adicional de esa sustancia (queda como "Bloqueada por alergia").`,
  },

  // ───────────────────────── Camas ─────────────────────────
  {
    id: "camas-estado",
    modulo: "camas",
    titulo: "Mapa y estado de camas",
    claves: ["cama", "camas", "mapa de camas", "limpieza", "fuera de servicio", "liberar cama", "ocupacion", "cama libre", "estado de la cama"],
    rutas: ["/camas"],
    roles: ["ADMIN", "ADMISION"],
    respuesta: `En \`/camas\` ves el mapa por sector con el estado de cada cama (Libre, Ocupada, En limpieza, Fuera de servicio).
- Para **cambiar el estado** a mano, seleccioná la cama y elegí el nuevo estado (por ejemplo En limpieza → Libre).
- Una cama con **internación activa** no se puede cambiar a mano: se libera sola con el alta.
- Las camas Fuera de servicio no reciben pacientes.

Crear o borrar camas y sectores lo hace ADMIN en \`/configuracion/admin\`.`,
  },
  {
    id: "altas",
    modulo: "camas",
    titulo: "Dar el alta (médica, enfermería, administrativa)",
    claves: ["alta", "dar de alta", "alta medica", "alta de enfermeria", "alta administrativa", "egreso", "egresar", "liberar la cama"],
    rutas: ["/historia-clinica", "/panel-medico", "/admision"],
    respuesta: `El alta tiene tres pasos, cada uno con su rol:
1. **Alta médica** (Médico o ADMIN): desde la historia clínica o el panel médico, botón **Alta médica**. También se produce al **firmar la epicrisis**.
2. **Alta de enfermería** (Enfermería o ADMIN): desde la historia clínica.
3. **Alta administrativa** (Admisión o ADMIN): cierra la internación y **libera la cama**.

Cada alta pide confirmación y no se puede deshacer desde la pantalla.`,
  },

  // ───────────────────────── Historia clínica ─────────────────────────
  {
    id: "hc-abrir",
    modulo: "historia-clinica",
    titulo: "Abrir una historia clínica",
    claves: ["historia clinica", "abrir la hc", "buscar hc", "expediente", "hc del paciente", "ver la historia"],
    rutas: ["/historia-clinica"],
    roles: CLINICOS,
    respuesta: `Entrá a \`/historia-clinica\` y buscá por nombre o DNI. Podés filtrar con **Todos / Activos / Alta / Ambulatorio**.

Al abrir el expediente tenés accesos a: anamnesis, evolución, prescripciones, enfermería, preanestesia, protocolos, epicrisis e **Imprimir carpeta**.

Cada rol ve solo sus pacientes: el médico ve los que trata, enfermería ve los internados activos y anestesia/instrumentación ve los de sus cirugías.`,
  },
  {
    id: "hc-evolucion",
    modulo: "historia-clinica",
    titulo: "Cargar una evolución",
    claves: ["evolucion", "evoluciones", "nota de evolucion", "nueva nota", "cargar la evolucion", "escribir evolucion"],
    rutas: ["/historia-clinica"],
    roles: ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO"],
    respuesta: `Para cargar una **evolución**:
1. Abrí la historia clínica del paciente desde \`/historia-clinica\`.
2. Entrá a **Evolución** (\`/historia-clinica/[id]/evolucion\`).
3. Tocá **Nueva nota**, escribí (o dictá con el micrófono) y guardá.

La nota puede quedar sin firmar y firmarse después; las que faltan firmar se marcan en el listado.`,
  },
  {
    id: "hc-prescripciones",
    modulo: "historia-clinica",
    titulo: "Hacer una prescripción / indicación",
    claves: ["prescripcion", "prescripciones", "prescribir", "indicacion", "indicaciones", "recetar", "indicar medicacion", "dosis", "frecuencia", "via de administracion", "dieta", "pedir estudio", "nueva prescripcion"],
    rutas: ["/historia-clinica", "/panel-medico"],
    roles: ["ADMIN", "MEDICO", "ANESTESIOLOGO"],
    respuesta: `Para cargar una **prescripción**:
1. Abrí la HC del paciente → **Prescripciones** (\`/historia-clinica/[id]/prescripciones\`).
2. Tocá **Nueva prescripción** y elegí el tipo: medicación, dieta, estudio, práctica, actividad u otra.
3. En medicación, buscá el medicamento en el stock de farmacia y completá dosis, frecuencia y vía.
4. Guardá: enfermería recibe la notificación de **indicación nueva**.

Si el paciente es alérgico a esa droga, la prescripción queda **Bloqueada por alergia** y no se puede aplicar. Las prescripciones se pueden suspender desde el mismo listado.`,
  },
  {
    id: "hc-anamnesis",
    modulo: "historia-clinica",
    titulo: "Anamnesis",
    claves: ["anamnesis", "examen fisico", "antecedentes", "motivo de consulta", "enfermedad actual"],
    rutas: ["/historia-clinica"],
    roles: ["ADMIN", "MEDICO", "ANESTESIOLOGO"],
    respuesta: `La **anamnesis** se carga en \`/historia-clinica/[id]/anamnesis\`. Hay una por internación: si ya existe, se edita la misma.
- Campos: motivo de consulta, enfermedad actual, antecedentes, examen físico, diagnóstico presuntivo y plan.
- Podés guardarla y firmarla después.`,
  },
  {
    id: "hc-epicrisis",
    modulo: "historia-clinica",
    titulo: "Epicrisis",
    claves: ["epicrisis", "resumen de alta", "informe de alta", "firmar epicrisis"],
    rutas: ["/historia-clinica"],
    roles: ["ADMIN", "MEDICO"],
    respuesta: `La **epicrisis** se carga en \`/historia-clinica/[id]/epicrisis\`.
- Campos: diagnósticos de ingreso y egreso, códigos CIE, resumen, estudios, tratamientos, condición y destino de egreso, medicación al alta y controles.
- Al **firmarla**, el sistema da el **alta médica**, finaliza el episodio y deja la cama en limpieza.
- Una vez firmada ya no se puede editar.`,
  },
  {
    id: "hc-interconsultas",
    modulo: "historia-clinica",
    titulo: "Interconsultas",
    claves: ["interconsulta", "interconsultas", "pedir interconsulta", "especialista"],
    rutas: ["/panel-medico", "/consultorio", "/historia-clinica"],
    roles: ["ADMIN", "MEDICO"],
    respuesta: `Las **interconsultas** están en la sección **Interconsultas** del **panel médico** de la internación (desde \`/atencion-medica\`) y en la pantalla de consulta del consultorio.
- Elegí el especialista y escribí el motivo.
- La interconsulta pasa por Solicitada → Respondida (o Cancelada).`,
  },
  {
    id: "hc-imprimir",
    modulo: "historia-clinica",
    titulo: "Imprimir la carpeta",
    claves: ["imprimir", "impresion", "carpeta", "pdf", "imprimir carpeta", "imprimir la hc"],
    rutas: ["/historia-clinica"],
    roles: ["ADMIN", "MEDICO", "ANESTESIOLOGO", "INSTRUMENTADOR"],
    respuesta: `Desde el expediente tocá **Imprimir carpeta** (o entrá a \`/historia-clinica/[id]/imprimir\`).
1. Marcá las secciones que querés incluir (podés usar Todas / Ninguna).
2. Imprimí o guardá como PDF desde el diálogo del navegador.`,
  },
  {
    id: "atencion-medica",
    modulo: "atencion-medica",
    titulo: "Atención médica / panel médico",
    claves: ["atencion medica", "panel medico", "mis pacientes", "pase de sala", "recorrida"],
    rutas: ["/atencion-medica", "/panel-medico"],
    roles: ["ADMIN", "MEDICO", "ANESTESIOLOGO"],
    respuesta: `En \`/atencion-medica\` ves los pacientes internados que tratás. Al abrir uno entrás al **panel médico**, donde tenés en una sola pantalla:
- alergias e interconsultas;
- prescripciones y evolución;
- acceso a la historia clínica completa y al alta médica.`,
  },

  // ───────────────────────── Enfermería ─────────────────────────
  {
    id: "enf-aplicar",
    modulo: "enfermeria",
    titulo: "Aplicar medicación",
    claves: ["aplicar", "aplicar medicacion", "administrar medicacion", "aplicacion", "dar la medicacion", "indicaciones nuevas", "pendientes de aplicar"],
    rutas: ["/enfermeria", "/historia-clinica"],
    roles: ["ADMIN", "ENFERMERO", "MEDICO", "ANESTESIOLOGO"],
    respuesta: `Para **aplicar medicación** de una prescripción:
1. Entrá a \`/enfermeria\` y abrí al paciente (o mirá el bloque **Indicaciones nuevas**).
2. En la prescripción activa tocá **Aplicar** y confirmá cantidad, vía y horario.

Al aplicar, el sistema descuenta el stock de farmacia y genera el cargo de facturación. Si no hay stock suficiente, no deja aplicar.`,
  },
  {
    id: "enf-controles",
    modulo: "enfermeria",
    titulo: "Registrar controles / signos vitales",
    claves: ["control", "controles", "signos vitales", "glucemia", "balance", "registrar control", "hoja de enfermeria", "aldrete", "curacion"],
    rutas: ["/enfermeria", "/historia-clinica"],
    roles: ["ADMIN", "ENFERMERO"],
    respuesta: `Para registrar **controles**:
1. Entrá a \`/enfermeria\` y elegí **Controles** en el paciente (o desde la HC → Enfermería).
2. Elegí el tipo: signos vitales, balance de líquidos, glucemia, peso, monitoreo respiratorio, curación o nota libre.
3. Completá y guardá. También podés **dictar** los signos vitales: el sistema los completa y los confirmás antes de guardar.

Los valores fuera de los rangos configurados se marcan con alerta. Los rangos los define ADMIN en \`/configuracion/admin\` → Rangos vitales.`,
  },
  {
    id: "enf-adhoc",
    modulo: "enfermeria",
    titulo: "Medicación adicional (sin prescripción)",
    claves: ["medicacion adicional", "ad hoc", "adhoc", "sin prescripcion", "medicacion extra"],
    rutas: ["/enfermeria", "/historia-clinica"],
    roles: ["ADMIN", "ENFERMERO", "MEDICO", "ANESTESIOLOGO"],
    respuesta: `La **medicación adicional** (sin prescripción previa) se registra en la HC → Enfermería → **Medicación adicional** (\`/historia-clinica/[id]/enfermeria/medicacion-adicional\`).
- Elegí el ítem de stock, la cantidad y un motivo (mínimo 3 caracteres).
- El sistema controla alergias, descuenta stock y genera el cargo.`,
  },

  // ───────────────────────── Quirófano ─────────────────────────
  {
    id: "qx-programar",
    modulo: "quirofano",
    titulo: "Programar una cirugía",
    claves: ["programar cirugia", "programo una cirugia", "programar", "cirugia", "agenda quirurgica", "turno de quirofano", "reservar quirofano", "nueva cirugia"],
    rutas: ["/quirofano", "/historia-clinica"],
    roles: ["ADMIN", "MEDICO"],
    respuesta: `Para **programar una cirugía**:
1. Entrá a \`/quirofano\`. En **Pacientes disponibles para programar** elegí al paciente (también podés hacerlo desde su HC).
2. Completá fecha, hora, quirófano, tipo (programada, urgencia o emergencia), cirujano, ayudantes, anestesiólogo, instrumentador, circulante, procedimiento y diagnóstico preoperatorio.
3. Guardá: la cirugía queda **Programada** en la agenda del día.

El paciente tiene que tener una internación activa sin otra cirugía programada o en curso. Reprogramar una cirugía es solo de ADMIN.`,
  },
  {
    id: "qx-libro",
    modulo: "quirofano",
    titulo: "Libro quirúrgico",
    claves: ["libro", "libro quirurgico", "parte quirurgico", "iniciar cirugia", "cerrar cirugia", "registro intraoperatorio", "implante", "implantes", "materiales"],
    rutas: ["/quirofano"],
    roles: ["ADMIN", "MEDICO", "ANESTESIOLOGO", "INSTRUMENTADOR", "ENFERMERO"],
    respuesta: `El **libro quirúrgico** se abre desde la card de la cirugía en \`/quirofano\` (\`/quirofano/[id]/libro\`).
- Cada integrante edita **sus campos** según el rol que tiene en esa cirugía (cirujano, anestesiólogo, instrumentador o circulante); el resto se ve en solo lectura.
- **Iniciar cirugía** pasa al paciente a "En quirófano".
- **Guardar borrador** guarda sin cerrar.
- **Cerrar cirugía** la completa (solo médico o ADMIN).
- Los medicamentos, materiales, implantes y prácticas que registres descuentan stock y generan cargos.`,
  },
  {
    id: "qx-plantillas",
    modulo: "quirofano",
    titulo: "Plantillas de protocolo",
    claves: ["plantilla", "plantillas", "mis plantillas", "protocolo quirurgico"],
    rutas: ["/plantillas", "/historia-clinica"],
    roles: ["ADMIN", "MEDICO", "ANESTESIOLOGO"],
    respuesta: `Tus **plantillas** están en \`/plantillas\`: podés crearlas, importarlas, editarlas o borrarlas. Son personales y sirven para completar más rápido el protocolo quirúrgico (\`/historia-clinica/[id]/protocolo-quirurgico\`).`,
  },

  // ───────────────────────── Anestesia ─────────────────────────
  {
    id: "anes-preanestesia",
    modulo: "anestesia",
    titulo: "Valoración preanestésica",
    claves: ["preanestesia", "preanestesica", "valoracion preanestesica", "asa", "evaluacion preanestesica"],
    rutas: ["/historia-clinica"],
    roles: ["ADMIN", "MEDICO", "ANESTESIOLOGO"],
    respuesta: `La **valoración preanestésica** está en la HC → **Preanestesia** (\`/historia-clinica/[id]/preanestesia\`).
- Campos: peso, talla, antecedentes, examen, score ASA y anestesia sugerida.
- Hay una por internación. Guardala y firmala.`,
  },
  {
    id: "anes-protocolo",
    modulo: "anestesia",
    titulo: "Protocolo de anestesia",
    claves: ["protocolo de anestesia", "protocolo anestesico", "anestesia", "registro anestesico", "drogas de anestesia"],
    rutas: ["/historia-clinica", "/quirofano"],
    roles: ["ADMIN", "ANESTESIOLOGO"],
    respuesta: `El **protocolo de anestesia** está en la HC → **Protocolo de anestesia** (\`/historia-clinica/[id]/protocolo-anestesia\`).
- Tiene pestañas: evaluación, técnica, registro (drogas y signos), balance y recuperación (Aldrete).
- El equipo y las drogas pueden precargarse desde la cirugía.
- Al **firmarlo** queda cerrado y ya no se puede editar.`,
  },

  // ───────────────────────── Consultorio / turnos ─────────────────────────
  {
    id: "turnos-agendar",
    modulo: "consultorio",
    titulo: "Agendar un turno",
    claves: ["turno", "turnos", "agendar", "agendar turno", "dar un turno", "nuevo turno", "sacar turno", "agenda"],
    rutas: ["/consultorio"],
    roles: ["ADMIN", "SECRETARIA"],
    respuesta: `Para **agendar un turno**:
1. Entrá a \`/consultorio\` y tocá **Agendar turno**.
2. Buscá al paciente (si no existe, lo podés registrar ahí mismo).
3. Elegí médico, fecha, hora disponible, obra social y motivo.
4. Guardá: el turno queda **Pendiente** en la agenda.

Solo podés agendarles turnos a los médicos que tenés asignados. Las asignaciones las hace ADMIN en \`/configuracion/asignar-secretaria-consultorio\`.`,
  },
  {
    id: "turnos-ciclo",
    modulo: "consultorio",
    titulo: "Confirmar, dar presente e iniciar consulta",
    claves: ["confirmar turno", "presente", "iniciar consulta", "finalizar consulta", "cancelar turno", "no asistio", "consulta", "atender turno"],
    rutas: ["/consultorio"],
    respuesta: `El turno pasa por estos estados:
1. **Secretaría** lo confirma (**Confirmar**), marca **Presente** cuando llega el paciente, o lo cancela o marca "No asistió".
2. **El médico** toca **Iniciar**: el turno pasa a "En consulta" y se abre la pantalla de consulta.
3. En la consulta, el médico carga evolución, prescripciones e interconsultas, y al **finalizar** el turno queda "Atendido". Desde ahí se puede imprimir la receta.`,
  },
  {
    id: "turnos-horarios",
    modulo: "consultorio",
    titulo: "Horarios del consultorio",
    claves: ["horario", "horarios", "mis horarios", "dias de atencion", "intervalo"],
    rutas: ["/consultorio"],
    roles: ["ADMIN", "MEDICO"],
    respuesta: `Los **horarios** se configuran en \`/consultorio\` → pestaña **Horarios**: día, hora de inicio y fin, intervalo entre turnos (30 min por defecto) y si está activo. Solo los horarios activos generan turnos disponibles.`,
  },

  // ───────────────────────── Guardia ─────────────────────────
  {
    id: "guardia",
    modulo: "guardia",
    titulo: "Guardia",
    claves: ["guardia", "emergencia", "triage", "registrar ingreso", "ingreso a guardia", "egreso de guardia", "prioridad"],
    rutas: ["/guardia"],
    roles: ["ADMIN", "ADMISION", "MEDICO", "ENFERMERO"],
    respuesta: `En \`/guardia\`:
- **Registrar paciente** da el ingreso a la guardia (motivo, prioridad, obra social).
- Las pestañas muestran En espera / En atención / Atendido / Anulado, y podés filtrar por fecha.
- Desde cada paciente podés **tomar la atención**, cambiar la prioridad, editar sus datos, anularlo o registrar el **egreso de guardia** (disposición y diagnóstico de egreso).
- Si hay que internarlo, se hace desde Admisión.`,
  },

  // ───────────────────────── Farmacia ─────────────────────────
  {
    id: "farmacia",
    modulo: "farmacia",
    titulo: "Stock de farmacia",
    claves: ["farmacia", "stock", "medicamento nuevo", "nuevo medicamento", "movimiento", "ingreso de stock", "reposicion", "ajuste de stock", "vencimiento", "troquel", "importar listado"],
    rutas: ["/farmacia"],
    roles: ["ADMIN", "FARMACIA"],
    respuesta: `En \`/farmacia\` ves el stock con alertas de stock bajo y de vencimientos.
- **Movimiento** (en cada fila): registra un ingreso, un egreso o un ajuste, con cantidad y motivo.
- **Nuevo medicamento** e **Importar listado**: cargan ítems. Crear, editar o desactivar ítems es solo de ADMIN.
- No hace falta descontar a mano lo que se aplica en enfermería o quirófano: eso se descuenta solo.`,
  },

  // ───────────────────────── Facturación ─────────────────────────
  {
    id: "facturacion",
    modulo: "facturacion",
    titulo: "Facturación / liquidación",
    claves: ["facturacion", "facturar", "liquidacion", "liquidar", "agregar cargo", "agrego un cargo", "nuevo cargo", "cargos de facturacion", "honorarios", "rubro", "gastos", "cerrar carpeta"],
    rutas: ["/facturacion"],
    roles: ["ADMIN", "FACTURACION"],
    respuesta: `En \`/facturacion\`:
1. Filtrá por obra social, período y estado (pendiente, parcial o facturado), o buscá por apellido o DNI.
2. Expandí la liquidación del paciente para ver los rubros: **HON** (honorarios), **GAS** (gastos), **MED** (medicamentos), **BIO** (bioquímica) y **KIN** (kinesiología).
3. Agregá cargos por función:
   - 10, 20 y 30: honorarios por práctica;
   - 60: gastos;
   - 91 y 92: importes manuales.

El importe sale del valor fijo de la obra social o de las unidades × el galeno vigente. La medicación aplicada y lo usado en quirófano se cargan solos.`,
  },

  // ───────────────────────── Configuración ─────────────────────────
  {
    id: "config-usuarios",
    modulo: "configuracion",
    titulo: "Usuarios y roles",
    claves: ["usuario", "usuarios", "crear usuario", "nuevo usuario", "contrasena", "cambiar rol", "dar permisos", "matricula"],
    rutas: ["/configuracion"],
    roles: ["ADMIN"],
    respuesta: `Los usuarios se gestionan en \`/configuracion/usuarios\` (solo ADMIN).
- **Nuevo usuario**: nombre, apellido, email, contraseña y rol; matrícula y especialidad si es médico o anestesiólogo.
- Desde ahí también se editan y desactivan. Un usuario desactivado no puede entrar al sistema.`,
  },
  {
    id: "config-admin",
    modulo: "configuracion",
    titulo: "Sectores, camas, obras sociales, quirófanos y rangos",
    claves: ["sector", "sectores", "crear cama", "obra social", "obras sociales", "quirofanos", "rangos vitales", "administrar sistema"],
    rutas: ["/configuracion"],
    roles: ["ADMIN"],
    respuesta: `En \`/configuracion/admin\` (solo ADMIN) hay pestañas para:
- sectores y camas;
- obras sociales (con la cobertura de internación y ambulatoria por separado);
- quirófanos;
- rangos de signos vitales, que disparan las alertas de enfermería.

No se puede borrar algo que esté en uso, por ejemplo un sector con camas o una cama con internación activa.`,
  },
  {
    id: "config-nomenclador",
    modulo: "configuracion",
    titulo: "Nomencladores y galenos",
    claves: ["nomenclador", "nomencladores", "galeno", "galenos", "practica propia", "sincronizar", "valor de la unidad"],
    rutas: ["/configuracion"],
    roles: ["ADMIN"],
    respuesta: `- \`/configuracion/nomencladores\`:
  - importás el nomenclador nacional (CSV);
  - creás la **copia por obra social**;
  - sincronizás las prácticas nuevas;
  - agregás prácticas propias y cargás importes fijos.
- \`/configuracion/galenos\`: cargás el galeno de cada obra social con su vigencia. Sin galeno vigente, solo se aplican los importes fijos.`,
  },
  {
    id: "config-asignaciones",
    modulo: "configuracion",
    titulo: "Asignar tratante / secretaría",
    claves: ["asignar tratante", "medico tratante", "sin tratante", "asignar secretaria", "secretaria del medico"],
    rutas: ["/configuracion"],
    roles: ["ADMIN"],
    respuesta: `- \`/configuracion/asignar-tratante\`: asigna médico tratante a las internaciones activas que no tienen.
- \`/configuracion/asignar-secretaria-consultorio\`: define a qué médicos les puede agendar turnos cada secretaria.`,
  },

  // ───────────────────────── General ─────────────────────────
  {
    id: "roles-permisos",
    modulo: "general",
    titulo: "Roles y permisos",
    claves: ["rol", "roles", "permiso", "permisos", "no tengo permiso", "no puedo", "acceso denegado", "no me deja", "no aparece", "403"],
    respuesta: `Cada rol ve solo los módulos que necesita y el servidor vuelve a controlar cada acción:
- **Admisión**: admisión, guardia y camas.
- **Médico**: atención médica, HC, quirófano, consultorio y plantillas.
- **Enfermería**: enfermería, HC, guardia y quirófano.
- **Anestesiología**: atención médica, HC, quirófano y plantillas.
- **Instrumentación**: HC y quirófano.
- **Secretaría**: consultorio.
- **Farmacia**: farmacia.
- **Facturación**: facturación y camas.
- **ADMIN**: todo, incluida configuración.

Si te aparece "Tu rol no tiene permiso", esa acción es de otro rol. Si creés que deberías poder hacerla, pedíselo a un ADMIN.`,
  },
  {
    id: "sesion",
    modulo: "general",
    titulo: "Sesión, contraseña y tema",
    claves: ["cerrar sesion", "cierro la sesion", "cerrar la sesion", "sesion", "salir del sistema", "sesion expirada", "volver a entrar", "modo oscuro", "tema", "cambiar contrasena", "olvide la contrasena"],
    respuesta: `- **Cerrar sesión**: desde el menú de usuario, arriba a la derecha.
- **Sesión vencida**: si ves "Sesión expirada", volvé a iniciar sesión. Lo que no hayas guardado se pierde.
- **Modo claro/oscuro**: se cambia desde la barra superior.
- **Contraseña**: la cambia un ADMIN desde \`/configuracion/usuarios\`.`,
  },
  {
    id: "dashboard",
    modulo: "dashboard",
    titulo: "Inicio / dashboard",
    claves: ["inicio", "dashboard", "pantalla principal", "kpi", "indicadores", "resumen del dia"],
    rutas: ["/"],
    respuesta: `El **inicio** (\`/\`) muestra los indicadores y accesos rápidos de **tu rol**. Las tarjetas con flecha llevan a la pantalla correspondiente; las que no tienen link son de módulos que tu rol no abre.`,
  },
  {
    id: "sugerir-mejora",
    modulo: "general",
    titulo: "Sugerir una mejora",
    claves: ["sugerir", "sugerencia", "mejora", "reportar", "feedback", "pedido de cambio"],
    respuesta: `¡Contame! Escribí lo que te gustaría cambiar, por ejemplo "estaría bueno que…" o "falta que…". Te muestro cómo la entendí y, si me confirmás, la registro para que la revise el equipo.`,
  },
];

/** Atajos que se ofrecen al abrir el asistente, según la pantalla actual. */
export const SUGERENCIAS_POR_MODULO: Record<string, string[]> = {
  dashboard: ["¿Qué puedo hacer con mi rol?", "¿Cómo admito un paciente?", "¿Dónde cargo la evolución?"],
  admision: ["¿Cómo admito un paciente?", "¿Qué hago si no hay cama?", "¿Cómo cargo una alergia?"],
  guardia: ["¿Cómo registro un ingreso a guardia?", "¿Cómo doy el egreso de guardia?"],
  camas: ["¿Cómo cambio el estado de una cama?", "¿Cómo se libera una cama?"],
  consultorio: ["¿Cómo agendo un turno?", "¿Cómo inicio la consulta?", "¿Dónde configuro mis horarios?"],
  "atencion-medica": ["¿Dónde cargo la evolución?", "¿Cómo hago una prescripción?", "¿Cómo pido una interconsulta?"],
  "historia-clinica": ["¿Dónde cargo la evolución?", "¿Cómo hago una prescripción?", "¿Cómo imprimo la carpeta?"],
  enfermeria: ["¿Cómo aplico la medicación?", "¿Cómo registro signos vitales?", "¿Qué es la medicación adicional?"],
  quirofano: ["¿Cómo programo una cirugía?", "¿Cómo uso el libro quirúrgico?"],
  anestesia: ["¿Dónde cargo la preanestesia?", "¿Cómo firmo el protocolo de anestesia?"],
  farmacia: ["¿Cómo registro un ingreso de stock?", "¿Cómo cargo un medicamento nuevo?"],
  facturacion: ["¿Cómo agrego un cargo?", "¿De dónde sale el importe de una práctica?"],
  configuracion: ["¿Cómo creo un usuario?", "¿Cómo cargo un galeno?"],
  general: ["¿Qué puedo hacer con mi rol?", "¿Cómo sugiero una mejora?"],
};
