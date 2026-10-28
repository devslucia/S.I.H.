/**
 * Adaptador opcional a un LLM externo para el asistente de uso.
 *
 * Prioridad:
 *  1. OPENAI_API_KEY (o cualquier API compatible con OpenAI vía OPENAI_BASE_URL). Modelo: OPENAI_MODEL.
 *  2. ANTHROPIC_API_KEY. Modelo: ASISTENTE_ANTHROPIC_MODEL.
 *  3. Sin claves (o ASISTENTE_IA_PROVEEDOR=local) → null y se usa el motor local.
 *
 * Ante cualquier error o timeout devuelve null: el caller cae al motor local.
 * Solo se envía el texto de la consulta, el rol, la ruta y fragmentos de la base de conocimiento:
 * nunca datos de pacientes ni de la sesión.
 */
import { rolLabel } from "@/lib/estados";
import type { TemaAyuda } from "./conocimiento";
import { RESPUESTA_CLINICA, modulosDelRol } from "./motor";

export type ProveedorLLM = "openai" | "anthropic";

export interface MensajeHistorial {
  rol: "usuario" | "asistente";
  texto: string;
}

const TIMEOUT_MS = 15_000;

export function proveedorConfigurado(): ProveedorLLM | null {
  if (process.env.ASISTENTE_IA_PROVEEDOR === "local") return null;
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export function armarSystemPrompt(rol: string, ruta: string | null, temas: TemaAyuda[]): string {
  const modulos = modulosDelRol(rol).join(", ") || "(ninguno)";
  const contexto = temas.length
    ? temas.map((t) => `### ${t.titulo}${t.roles ? ` (roles: ${t.roles.join(", ")})` : ""}\n${t.respuesta}`).join("\n\n")
    : "(sin fragmentos relevantes)";
  return `Sos el asistente de USO del SIH (Sistema de Información Hospitalaria). Respondés en español rioplatense (voseo), breve y concreto (máximo ~150 palabras), con pasos numerados cuando corresponda.

REGLAS OBLIGATORIAS:
- Solo ayudás a usar el software SIH: pantallas, botones, flujos, permisos.
- NUNCA des indicaciones médicas clínicas (diagnósticos, tratamientos, dosis, conductas, interpretación de valores). Si te preguntan algo clínico respondé EXACTAMENTE: "${RESPUESTA_CLINICA}"
- No inventes pantallas, botones ni rutas: usá solo lo que está en el CONTEXTO. Si no lo sabés, decilo y sugerí a quién preguntar (un ADMIN).
- Respetá el rol del usuario: si la acción no está permitida para su rol, decilo y nombrá qué roles pueden.
- Escribí las rutas entre backticks, por ejemplo \`/admision\`. Usá **negrita** para nombres de botones.
- No pidas ni repitas datos de pacientes.

USUARIO: rol ${rolLabel(rol)} (${rol}). Pantalla actual: ${ruta ?? "desconocida"}.
Módulos que ve su rol: ${modulos}.

CONTEXTO (base de conocimiento del SIH):
${contexto}`;
}

async function fetchConTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function consultarOpenAI(system: string, mensajes: MensajeHistorial[]): Promise<string | null> {
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const res = await fetchConTimeout(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 600,
      messages: [
        { role: "system", content: system },
        ...mensajes.map((m) => ({ role: m.rol === "usuario" ? "user" : "assistant", content: m.texto })),
      ],
    }),
  });
  if (!res.ok) {
    console.error("[asistente] OpenAI error", res.status);
    return null;
  }
  const data = await res.json();
  const texto = data?.choices?.[0]?.message?.content;
  return typeof texto === "string" && texto.trim() ? texto.trim() : null;
}

async function consultarAnthropic(system: string, mensajes: MensajeHistorial[]): Promise<string | null> {
  const res = await fetchConTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ASISTENTE_ANTHROPIC_MODEL || "claude-haiku-5-5",
      max_tokens: 600,
      system,
      messages: mensajes.map((m) => ({ role: m.rol === "usuario" ? "user" : "assistant", content: m.texto })),
    }),
  });
  if (!res.ok) {
    console.error("[asistente] Anthropic error", res.status);
    return null;
  }
  const data = await res.json();
  const texto = data?.content?.find?.((b: { type?: string }) => b.type === "text")?.text;
  return typeof texto === "string" && texto.trim() ? texto.trim() : null;
}

/** Devuelve la respuesta del proveedor configurado, o null si no hay proveedor o falló. */
export async function consultarLLM(
  system: string,
  mensajes: MensajeHistorial[]
): Promise<{ texto: string; proveedor: ProveedorLLM } | null> {
  const proveedor = proveedorConfigurado();
  if (!proveedor) return null;
  // Las APIs exigen que la conversación empiece por el usuario
  const desdeUsuario = mensajes.slice(mensajes.findIndex((m) => m.rol === "usuario"));
  try {
    const texto =
      proveedor === "openai" ? await consultarOpenAI(system, desdeUsuario) : await consultarAnthropic(system, desdeUsuario);
    return texto ? { texto, proveedor } : null;
  } catch (e) {
    console.error("[asistente] LLM no disponible, uso motor local:", e instanceof Error ? e.message : e);
    return null;
  }
}
