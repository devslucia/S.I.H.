import { requireRole } from "@/lib/rbac";
import { ROLES_POR_MODULO } from "@/lib/navegacion";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buscarTemas, responderLocal, type RespuestaAsistente } from "@/lib/asistente/motor";
import { armarSystemPrompt, consultarLLM } from "@/lib/asistente/llm";

const TODOS_LOS_ROLES = ROLES_POR_MODULO["/"];

const bodySchema = z.object({
  mensaje: z.string().trim().min(1, "Escribí tu consulta").max(1000, "La consulta es demasiado larga (máx. 1000 caracteres)"),
  ruta: z.string().max(300).nullish(),
  // El rol que manda el cliente se ignora: se usa el de la sesión
  rol: z.string().optional(),
  historial: z
    .array(z.object({ rol: z.enum(["usuario", "asistente"]), texto: z.string().max(2000) }))
    .max(12)
    .optional(),
});

// Límite simple por usuario (por instancia): evita abuso del proveedor externo
const VENTANA_MS = 60_000;
const MAX_POR_VENTANA = 20;
const uso = new Map<string, number[]>();

function limitado(userId: string): boolean {
  const ahora = Date.now();
  const recientes = (uso.get(userId) ?? []).filter((t) => ahora - t < VENTANA_MS);
  recientes.push(ahora);
  uso.set(userId, recientes);
  return recientes.length > MAX_POR_VENTANA;
}

/** POST /api/asistente/chat — ayuda de uso del sistema según rol y pantalla. No guarda la conversación. */
export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(...TODOS_LOS_ROLES);
  if (error) return error;

  if (limitado(session.user.id)) {
    return NextResponse.json({ error: "Hiciste muchas consultas seguidas. Esperá un minuto y probá de nuevo." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Consulta inválida" }, { status: 400 });
  }

  const { mensaje, historial = [] } = parsed.data;
  const ruta = parsed.data.ruta ?? null;
  const rol = session.user.rol;

  const local = responderLocal({ mensaje, ruta, rol });
  // La guardia clínica y la captura de mejoras son siempre locales y deterministas
  if (local.clinica || local.mejoraDetectada) return NextResponse.json(local);

  const temas = buscarTemas(mensaje, ruta, 4);
  const llm = await consultarLLM(armarSystemPrompt(rol, ruta, temas), [
    ...historial.slice(-6),
    { rol: "usuario", texto: mensaje },
  ]);
  if (!llm) return NextResponse.json(local);

  const respuesta: RespuestaAsistente = {
    respuesta: llm.texto,
    fuente: llm.proveedor,
    sugerencias: local.sugerencias,
    mejoraDetectada: false,
  };
  return NextResponse.json(respuesta);
}
