/**
 * Motor local del asistente de uso: guardia clínica, detección de mejoras e intents
 * sobre la base de conocimiento. Funciona sin proveedor externo y además se usa como
 * pre-filtro cuando hay LLM (la guardia clínica y la captura de mejoras son siempre locales).
 */
import { ROLES_POR_MODULO } from "@/lib/navegacion";
import { rolLabel } from "@/lib/estados";
import {
  MODULOS,
  SUGERENCIAS_POR_MODULO,
  TEMAS,
  moduloDeRuta,
  moduloLabel,
  type TemaAyuda,
} from "./conocimiento";

export const RESPUESTA_CLINICA = "No puedo dar consejos médicos. Solo puedo ayudarte con el uso del sistema.";

export type FuenteRespuesta = "local" | "openai" | "anthropic";

export interface BorradorMejora {
  titulo: string;
  descripcion: string;
  modulo: string | null;
  ruta: string | null;
  prioridad: "BAJA" | "MEDIA" | "ALTA";
}

export interface ContextoAsistente {
  mensaje: string;
  ruta: string | null;
  rol: string;
}

export interface RespuestaAsistente {
  respuesta: string;
  fuente: FuenteRespuesta;
  sugerencias: string[];
  /** true si la respuesta es la negativa fija por consulta clínica */
  clinica?: boolean;
  mejoraDetectada: boolean;
  borradorMejora?: BorradorMejora;
}

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:()"'«»]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ───────────────────────── Guardia clínica ─────────────────────────

const PATRONES_CLINICOS: RegExp[] = [
  /\b(que|cuanto|cual|cuantos)\b.{0,30}\b(le doy|le damos|le indico|le pongo|darle|indicarle|administrarle|recetarle|prescribirle|ponerle)\b/,
  /\bdosis (maxima|recomendada|habitual|pediatrica|de carga|correcta|adecuada)\b/,
  /\b(posologia|mg ?\/ ?kg)\b/,
  /\b(diagnostico diferencial|que tiene el paciente|que puede tener|que enfermedad|es grave|es normal que|es peligroso)\b/,
  /\b(como (se )?trat(o|a|ar)|tratamiento (para|de|del|indicado)|que antibiotico|que medicacion (le|para|usar)|que droga (uso|le))\b/,
  /\b(contraindicad|interaccion(es)? (entre|de|con)|efectos (adversos|secundarios)|sintomas de|signos de alarma)\b/,
  /\b(deberia|debo|conviene|hay que) (operar|internar|derivar|suspender el|darle|indicarle|medicar)\b/,
  /\b(le )?(puedo|podemos|se puede|se le puede) (dar|darle|mezclar|combinar|indicar|indicarle|administrar|administrarle|usar)\b/,
  /\bque hago (si|con|cuando) (el|la|un|una|mi) (paciente|chico|nene|nena|bebe|senor|senora)\b/,
  /\b(fiebre|febril|desatur|hipotens|hipertens|taquicard|bradicard|convulsi|sangrado|disnea|vomit|dolor (toracico|abdominal|de pecho|de cabeza))\w*/,
];

// Si la pregunta es sobre la pantalla/el registro, no es clínica ("¿dónde cargo la dosis?")
const MARCADORES_USO =
  /\b(donde|cargo|cargar|carga|registro|registrar|anoto|anotar|pongo|completo|completar|busco|buscar|encuentro|imprimo|imprimir|firmo|firmar|edito|editar|pantalla|boton|sistema|sih|modulo|campo|formulario|pestana|menu|seccion|guardo|guardar|aparece|figura)\b/;

export function esConsultaClinica(textoNormalizado: string): boolean {
  if (!PATRONES_CLINICOS.some((re) => re.test(textoNormalizado))) return false;
  return !MARCADORES_USO.test(textoNormalizado);
}

// ───────────────────────── Detección de mejoras ─────────────────────────

const PATRONES_MEJORA: RegExp[] = [
  /\bestaria (bueno|bien|genial|util|piola|barbaro) (que|poder|tener|si)\b/,
  /\bfalta(ria)? (que|un|una|el|la|poder)\b/,
  /\bdeberian? (agregar|poner|permitir|hacer|tener|sumar|mostrar|cambiar)\b/,
  /\bno (me )?(resulta|es) practico\b/,
  /\bes poco practico\b/,
  /\bseria (util|bueno|ideal|mejor|practico) (que|poder|tener|si)\b/,
  /\b(sugiero|propongo|recomiendo) (que|agregar|poner|sumar)\b/,
  /\bme gustaria (que|poder)\b/,
  /\bpodrian (agregar|poner|hacer|sumar|permitir|cambiar|mostrar)\b/,
  /\bojala (que|se pudiera|pudiera)\b/,
  /\bes (muy )?(incomodo|engorroso|lento) (que|tener que|cuando)\b/,
];

const PALABRAS_URGENCIA = /\b(urgente|muy importante|bloquea|bloqueante|no puedo trabajar|nos frena|critico)\b/;

const PALABRAS_MODULO: [RegExp, string][] = [
  [/\b(admision|internar|espera de cama|paciente nuevo)\b/, "admision"],
  [/\bguardia\b/, "guardia"],
  [/\bcamas?\b/, "camas"],
  [/\b(turnos?|consultorio|agenda|secretaria)\b/, "consultorio"],
  [/\b(anestesia|preanestesia|anestesiologo)\b/, "anestesia"],
  [/\b(quirofano|cirugias?|libro quirurgico|plantillas?)\b/, "quirofano"],
  [/\b(enfermeria|signos vitales|controles|aplicar)\b/, "enfermeria"],
  [/\b(evolucion|prescripcion(es)?|anamnesis|epicrisis|historia clinica|hc|interconsultas?)\b/, "historia-clinica"],
  [/\b(farmacia|stock|medicamentos?)\b/, "farmacia"],
  [/\b(facturacion|facturar|liquidacion|cargos?|galenos?|nomenclador)\b/, "facturacion"],
  [/\b(usuarios?|configuracion|obras? sociales?)\b/, "configuracion"],
];

export function detectarMejora(mensaje: string, ruta: string | null): BorradorMejora | null {
  const n = normalizar(mensaje);
  if (!PATRONES_MEJORA.some((re) => re.test(n))) return null;

  const limpio = mensaje.replace(/\s+/g, " ").trim();
  // Título: la primera oración, sin muletillas de cortesía, capitalizada y acotada
  const primera = limpio.split(/[.!?]\s/)[0].replace(/^(hola|buenas|che)[,!. ]+/i, "");
  let titulo = primera.length > 90 ? primera.slice(0, 87).trimEnd() + "…" : primera;
  titulo = titulo.charAt(0).toUpperCase() + titulo.slice(1);

  const porTexto = PALABRAS_MODULO.find(([re]) => re.test(n))?.[1] ?? null;
  const porRuta = moduloDeRuta(ruta);
  // La ruta manda, salvo que esté en el inicio y el texto nombre otro módulo
  const modulo = porRuta && porRuta !== "dashboard" ? porRuta : porTexto ?? porRuta ?? "general";

  return {
    titulo,
    descripcion: limpio.slice(0, 2000),
    modulo,
    ruta,
    prioridad: PALABRAS_URGENCIA.test(n) ? "ALTA" : "MEDIA",
  };
}

// ───────────────────────── Intents ─────────────────────────

/** Verbos en infinitivo como raíz ("aplicar" → "aplic") para aceptar "aplico", "aplicación"… */
function raiz(clave: string): string {
  if (!clave.includes(" ") && /(ar|er|ir)$/.test(clave) && clave.length >= 7) return clave.slice(0, -2);
  return clave;
}

function puntuar(tema: TemaAyuda, texto: string, modulo: string | null, ruta: string | null): number {
  let score = 0;
  for (const clave of tema.claves) {
    const re = new RegExp(`\\b${raiz(clave).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    if (re.test(texto)) score += clave.includes(" ") ? 3 : 2;
  }
  if (score === 0) return 0;
  if (ruta && tema.rutas?.some((r) => (r === "/" ? ruta === "/" : ruta.startsWith(r)))) score += 1;
  if (modulo && tema.modulo === modulo) score += 1;
  return score;
}

export function buscarTemas(texto: string, ruta: string | null, max = 3): TemaAyuda[] {
  const n = normalizar(texto);
  const modulo = moduloDeRuta(ruta);
  return TEMAS.map((t) => ({ t, s: puntuar(t, n, modulo, ruta) }))
    .filter((x) => x.s >= 2)
    .sort((a, b) => b.s - a.s)
    .slice(0, max)
    .map((x) => x.t);
}

function nombresRoles(roles: string[]): string {
  return roles.map(rolLabel).join(", ");
}

/** Aviso cuando el tema existe pero el rol del usuario no puede hacerlo. */
export function avisoPermiso(tema: TemaAyuda, rol: string): string | null {
  if (!tema.roles || tema.roles.includes(rol)) return null;
  return `Con tu rol (**${rolLabel(rol)}**) no podés hacer esto. Lo pueden hacer: ${nombresRoles(tema.roles)}. Te explico igual cómo funciona:`;
}

/** Módulos que el rol ve en la navegación (para "¿qué puedo hacer?"). */
export function modulosDelRol(rol: string): string[] {
  return Object.entries(ROLES_POR_MODULO)
    .filter(([href, roles]) => href !== "/" && roles.includes(rol))
    .map(([href]) => href);
}

export function sugerenciasPara(ruta: string | null): string[] {
  const modulo = moduloDeRuta(ruta) ?? "general";
  return SUGERENCIAS_POR_MODULO[modulo] ?? SUGERENCIAS_POR_MODULO.general;
}

const SALUDO = /^(hola|buenas|buen dia|buenos dias|buenas tardes|buenas noches|hey|que tal)\b/;
const QUE_PUEDO = /\b(que (puedo|podes|sabes) hacer|para que servis|que hago con mi rol|mi rol|ayuda general|como funciona el sistema)\b/;
const ESTA_PANTALLA = /\b(esta pantalla|aca|esta seccion|esta pagina|para que sirve esto|que hago aca|donde estoy)\b/;
const AGRADECIMIENTO = /^(gracias|muchas gracias|genial|perfecto|ok|dale|listo)\b/;

function respuestaQuePuedo(rol: string): string {
  const mods = modulosDelRol(rol);
  const lineas = mods.map((href) => {
    const slug = href.slice(1);
    return `- ${MODULOS[slug]?.label ?? slug}: \`${href}\``;
  });
  return `Con tu rol (**${rolLabel(rol)}**) tenés acceso a:\n${lineas.join("\n")}\n\nPreguntame cómo hacer algo en cualquiera de esas pantallas. También podés contarme qué mejorarías del sistema.`;
}

function respuestaPantalla(ruta: string | null, rol: string): string | null {
  const modulo = moduloDeRuta(ruta);
  if (!modulo) return null;
  const temas = TEMAS.filter((t) => t.modulo === modulo && (!t.roles || t.roles.includes(rol)));
  if (temas.length === 0) return null;
  const label = MODULOS[modulo]?.label ?? modulo;
  return `Estás en **${label}**. Desde acá podés:\n${temas.map((t) => `- ${t.titulo}`).join("\n")}\n\nPreguntame por cualquiera de esas tareas y te explico los pasos.`;
}

/** Respuesta 100 % local (sin proveedor externo). */
export function responderLocal({ mensaje, ruta, rol }: ContextoAsistente): RespuestaAsistente {
  const n = normalizar(mensaje);
  const sugerencias = sugerenciasPara(ruta);
  const base = { fuente: "local" as const, mejoraDetectada: false };

  if (esConsultaClinica(n)) {
    return { ...base, respuesta: RESPUESTA_CLINICA, sugerencias, clinica: true };
  }

  const mejora = detectarMejora(mensaje, ruta);
  if (mejora) {
    return {
      ...base,
      respuesta: `Entendí que es una sugerencia de mejora para **${moduloLabel(mejora.modulo)}**. ¿Querés que registre esta mejora?`,
      sugerencias: [],
      mejoraDetectada: true,
      borradorMejora: mejora,
    };
  }

  if (QUE_PUEDO.test(n)) return { ...base, respuesta: respuestaQuePuedo(rol), sugerencias };
  if (ESTA_PANTALLA.test(n)) {
    const r = respuestaPantalla(ruta, rol);
    if (r) return { ...base, respuesta: r, sugerencias };
  }

  const temas = buscarTemas(mensaje, ruta);
  if (temas.length > 0) {
    const [principal, ...otros] = temas;
    const aviso = avisoPermiso(principal, rol);
    const extra = otros.length ? `\n\nTambién te puede servir: ${otros.map((t) => `**${t.titulo}**`).join(", ")}.` : "";
    return {
      ...base,
      respuesta: `${aviso ? aviso + "\n\n" : ""}${principal.respuesta}${extra}`,
      sugerencias: otros.map((t) => `¿${t.titulo}?`),
    };
  }

  if (SALUDO.test(n) && n.split(" ").length <= 4) {
    return {
      ...base,
      respuesta: `¡Hola! Soy el asistente de uso del SIH. Te ayudo a encontrar pantallas y a seguir los pasos de cada tarea según tu rol (**${rolLabel(rol)}**). No doy consejos médicos.`,
      sugerencias,
    };
  }
  if (AGRADECIMIENTO.test(n) && n.split(" ").length <= 3) {
    return { ...base, respuesta: "¡De nada! Si necesitás algo más, preguntame.", sugerencias };
  }

  const pantalla = respuestaPantalla(ruta, rol);
  return {
    ...base,
    respuesta: `No encontré una respuesta para eso. Probá preguntarlo de otra forma, por ejemplo "¿cómo programo una cirugía?" o "¿dónde cargo la evolución?".${pantalla ? `\n\n${pantalla}` : ""}`,
    sugerencias,
  };
}
