import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { internacionAccessError } from "@/lib/internaciones-visibility";
import { ensureHcEpisodio } from "@/lib/hc-context";
import { NextRequest, NextResponse } from "next/server";

/**
 * Firma de epicrisis = alta médica.
 * - La epicrisis se resuelve por el episodio de la internación (el body es opcional).
 * - Solo pasa a ALTA_MEDICA desde ACTIVA / POSTQUIRURGICO (nunca retrocede un alta posterior).
 * - La cama NO se toca: se libera recién en el alta administrativa (mismo criterio que /alta).
 */
export async function POST(_req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole("ADMIN", "MEDICO");
  if (error) return error;

  const accesoError = await internacionAccessError(params.internacionId, session.user.id, session.user.rol);
  if (accesoError) return accesoError;

  const ctx = await ensureHcEpisodio(params.internacionId);
  if (!ctx) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const epicrisis = await prisma.epicrisis.findUnique({ where: { episodioId: ctx.episodio.id } });
  if (!epicrisis) {
    return NextResponse.json({ error: "Guardá la epicrisis antes de firmarla" }, { status: 409 });
  }
  if (epicrisis.firmadaAt) {
    return NextResponse.json({ error: "La epicrisis ya está firmada" }, { status: 409 });
  }

  const internacion = await prisma.internacion.findUnique({
    where: { id: params.internacionId },
    select: { estado: true },
  });
  if (internacion?.estado === "EN_QUIROFANO") {
    return NextResponse.json(
      { error: "El paciente está en quirófano: cerrá la cirugía antes de firmar la epicrisis" },
      { status: 409 }
    );
  }

  const ahora = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.epicrisis.update({
      where: { id: epicrisis.id },
      data: { firmadaAt: ahora, medicoId: epicrisis.medicoId ?? session.user.id },
    });

    await tx.internacion.updateMany({
      where: { id: params.internacionId, estado: { in: ["ACTIVA", "POSTQUIRURGICO"] } },
      data: { estado: "ALTA_MEDICA", fechaEgreso: ahora, altaMedicaAt: ahora },
    });

    await tx.firmaDocumento.create({
      data: {
        tipoDoc: "EPICRISIS",
        docId: epicrisis.id,
        usuarioId: session.user.id,
        hash: `firma-${Date.now()}`,
      },
    });
  });

  return NextResponse.json({
    success: true,
    firmadaAt: ahora.toISOString(),
    message: "Epicrisis firmada. Alta médica registrada: pendiente alta de enfermería y administrativa.",
  });
}
