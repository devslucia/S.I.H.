import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { formatZodError } from "@/lib/validations/format-zod-error";

const createCirugiaSchema = z.object({
  internacionId: z.string().uuid("Internación inválida"),
  quirofanoId: z.string().uuid("Seleccioná un quirófano"),
  fechaProgramada: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Fecha programada inválida"),
  horaProgramada: z.string().regex(/^\d{2}:\d{2}$/, "Hora programada inválida"),
  tipo: z.enum(["PROGRAMADA", "URGENCIA", "EMERGENCIA"]),
  cirujanoId: z.string().optional(),
  anestesiologoId: z.string().optional(),
  procedimiento: z.string().optional(),
  diagnosticoPreop: z.string().optional(),
});

// Estados de internación en los que se puede programar una cirugía
const ESTADOS_PROGRAMABLES = ["ACTIVA", "POSTQUIRURGICO", "EN_QUIROFANO"] as const;

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "MEDICO");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = createCirugiaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }
  const data = parsed.data;

  // Cualquier MEDICO puede programar sobre una internación activa (el cirujano no
  // siempre es el tratante; /quirofano/internaciones-disponibles ya le muestra todas).
  const internacion = await prisma.internacion.findUnique({
    where: { id: data.internacionId },
    select: { estado: true },
  });
  if (!internacion) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }
  if (!(ESTADOS_PROGRAMABLES as readonly string[]).includes(internacion.estado)) {
    return NextResponse.json(
      { error: "La internación no está activa: no se puede programar una cirugía" },
      { status: 409 }
    );
  }

  const quirofano = await prisma.quirofano.findUnique({
    where: { id: data.quirofanoId },
    select: { disponible: true },
  });
  if (!quirofano) {
    return NextResponse.json({ error: "Quirófano no encontrado" }, { status: 404 });
  }
  if (!quirofano.disponible) {
    return NextResponse.json({ error: "El quirófano seleccionado no está disponible" }, { status: 409 });
  }

  // Si un médico programa sin indicar cirujano, queda como cirujano (y con acceso al libro).
  const cirujanoId = data.cirujanoId || (session.user.rol === "MEDICO" ? session.user.id : null);

  const cirugia = await prisma.cirugia.create({
    data: {
      internacionId: data.internacionId,
      quirofanoId: data.quirofanoId,
      // Mediodía UTC: el día no se corre al mostrarlo en hora local (UTC-3)
      fechaProgramada: new Date(`${data.fechaProgramada.slice(0, 10)}T12:00:00.000Z`),
      horaProgramada: data.horaProgramada,
      tipo: data.tipo,
      estado: "PROGRAMADA",
      cirujanoId,
      anestesiologoId: data.anestesiologoId || null,
      procedimiento: data.procedimiento || null,
      diagnosticoPreop: data.diagnosticoPreop || null,
    },
    include: {
      internacion: { include: { paciente: true } },
    },
  });

  return NextResponse.json(cirugia, { status: 201 });
}
