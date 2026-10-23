import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { capitalize } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const nuevaFechaRaw = typeof body?.nuevaFecha === "string" ? body.nuevaFecha : "";
  const motivo = typeof body?.motivo === "string" ? body.motivo.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}/.test(nuevaFechaRaw) || !motivo) {
    return NextResponse.json({ error: "Indicá la nueva fecha y el motivo de la reprogramación" }, { status: 400 });
  }
  // El input datetime-local llega sin zona: se interpreta en hora de Argentina (UTC-3)
  const [diaNuevo, horaNueva] = nuevaFechaRaw.split("T");
  const nuevaFecha = new Date(horaNueva ? `${diaNuevo}T${horaNueva.slice(0, 5)}:00-03:00` : `${diaNuevo}T12:00:00.000Z`);
  if (Number.isNaN(nuevaFecha.getTime())) {
    return NextResponse.json({ error: "Fecha de reprogramación inválida" }, { status: 400 });
  }

  const existe = await prisma.cirugia.findUnique({ where: { id: params.cirugiaId }, select: { estado: true } });
  if (!existe) {
    return NextResponse.json({ error: "Cirugía no encontrada" }, { status: 404 });
  }
  if (["COMPLETADA", "CANCELADA"].includes(existe.estado)) {
    return NextResponse.json({ error: "No se puede reprogramar una cirugía cerrada o cancelada" }, { status: 409 });
  }

  const usuarioId = session.user.id;
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });

  const result = await prisma.$transaction(async (tx) => {
    const cirugia = await tx.cirugia.findUnique({
      where: { id: params.cirugiaId },
      select: { fechaProgramada: true, internacionId: true },
    });
    if (!cirugia) throw new Error("Cirugía no encontrada");

    const reprogramacion = await tx.reprogramacion.create({
      data: {
        cirugiaId: params.cirugiaId,
        fechaOriginal: cirugia.fechaProgramada,
        nuevaFecha,
        motivo,
        registradoPor: usuario ? (usuario.apellido ? `${capitalize(usuario.apellido)}, ${capitalize(usuario.nombre)}` : capitalize(usuario.nombre)) : "Desconocido",
      },
    });

    // La cirugía sigue PROGRAMADA en la nueva fecha (el historial queda en Reprogramacion):
    // así se puede iniciar/cerrar normalmente el día que corresponda.
    await tx.cirugia.update({
      where: { id: params.cirugiaId },
      data: {
        estado: "PROGRAMADA",
        fechaProgramada: new Date(`${diaNuevo}T12:00:00.000Z`),
        ...(horaNueva ? { horaProgramada: horaNueva.slice(0, 5) } : {}),
      },
    });

    // Si el paciente figuraba en quirófano por esta cirugía, vuelve a internación activa
    await tx.internacion.updateMany({
      where: { id: cirugia.internacionId, estado: "EN_QUIROFANO" },
      data: { estado: "ACTIVA" },
    });

    return reprogramacion;
  });

  return NextResponse.json(result, { status: 201 });
}
