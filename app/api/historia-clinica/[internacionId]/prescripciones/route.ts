import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ensureHcEpisodio } from "@/lib/hc-context";
import { internacionAccessError } from "@/lib/internaciones-visibility";
import { createPrescripcionSchema } from "@/lib/validations/prescripcion.schema";
import { verificarAlergia } from "@/lib/utils/alertas-alergia";
import { crearNotificacionesPrescripcion } from "@/lib/notificaciones";
import { NextRequest, NextResponse } from "next/server";
import { formatZodError } from "@/lib/validations/format-zod-error";

const PRESCRIPCIONES_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];
const PRESCRIPCIONES_WRITE_ROLES = ["ADMIN", "MEDICO", "ANESTESIOLOGO"];

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...PRESCRIPCIONES_READ_ROLES);
  if (error) return error;

  const accesoError = await internacionAccessError(params.internacionId, session.user.id, session.user.rol);
  if (accesoError) return accesoError;

  const ctx = await ensureHcEpisodio(params.internacionId);
  if (!ctx) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }
  const { hc } = ctx;

  const prescripciones = await prisma.prescripcion.findMany({
    where: { hcId: hc.id },
    include: { usuario: { select: { id: true, nombre: true } } },
    orderBy: { fecha: "desc" },
  });

  return NextResponse.json(prescripciones);
}

export async function POST(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...PRESCRIPCIONES_WRITE_ROLES);
  if (error) return error;

  const accesoError = await internacionAccessError(params.internacionId, session.user.id, session.user.rol);
  if (accesoError) return accesoError;

  const ctx = await ensureHcEpisodio(params.internacionId);
  if (!ctx) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }
  const { hc, episodio } = ctx;
  const paciente = await prisma.paciente.findUnique({
    where: { id: ctx.internacion.pacienteId },
    select: { id: true, apellido: true, nombre: true },
  });

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }
  const items = Array.isArray(body.items) ? body.items : [body];

  const results: { ok: boolean; nombre: string; error?: string; prescripcion?: object }[] = [];

  for (const item of items) {
    const parsed = createPrescripcionSchema.safeParse(item);
    if (!parsed.success) {
      results.push({ ok: false, nombre: item.droga || item.tipo || "desconocido", error: formatZodError(parsed.error) });
      continue;
    }

    const data = parsed.data;

    if (data.droga) {
      const { bloqueada, alergia } = await verificarAlergia(ctx.internacion.pacienteId, data.droga);
      if (bloqueada) {
        const prescripcion = await prisma.prescripcion.create({
          data: {
            ...data,
            hcId: hc.id,
            episodioId: episodio.id,
            usuarioId: session.user.id,
            estado: "BLOQUEADA_ALERGIA",
            bloqueadaAlergia: true,
          },
        });
        results.push({
          ok: false,
          nombre: data.droga || data.tipo,
          error: `Alergia: ${alergia?.sustancia || "reacción registrada"}`,
          prescripcion,
        });
        continue;
      }
    }

    try {
      const prescripcion = await prisma.prescripcion.create({
        data: {
          ...data,
          hcId: hc.id,
          episodioId: episodio.id,
          usuarioId: session.user.id,
        },
      });

      const detalle = data.droga || data.descripcion || data.tipo || "indicación";
      const extra = [data.dosis && `dosis ${data.dosis}`, data.via && `vía ${data.via}`].filter(Boolean).join(", ");

      if (paciente) {
        await crearNotificacionesPrescripcion(prisma, {
          prescripcionId: prescripcion.id,
          pacienteId: paciente.id,
          internacionId: params.internacionId,
          episodioId: episodio.id,
          pacienteApellido: paciente.apellido,
          pacienteNombre: paciente.nombre,
          detalle: extra ? `${detalle} (${extra})` : detalle,
        }).catch(() => {});
      }

      results.push({ ok: true, nombre: data.droga || data.tipo, prescripcion });
    } catch (e: unknown) {
      console.error("Error al crear prescripción:", e);
      results.push({ ok: false, nombre: data.droga || data.tipo, error: "Error al crear" });
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ ok: allOk, items: results }, { status: allOk ? 201 : 207 });
}
