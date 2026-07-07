import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; medicoId: string } }
) {
  const { session, error } = await requireRole("ADMIN", "MEDICO");
  if (error) return error;

  const internacionId = params.id;
  const { medicoId } = params;

  const internacion = await prisma.internacion.findUnique({
    where: { id: internacionId },
    select: { id: true },
  });
  if (!internacion) {
    return NextResponse.json(
      { error: "Internación no encontrada" },
      { status: 404 }
    );
  }

  const rol = (session!.user as any).rol as string;
  const userId = session!.user.id as string;

  if (rol === "MEDICO") {
    if (medicoId !== userId) {
      return NextResponse.json(
        { error: "Solo puedes renunciar a tu propia asignación como tratante" },
        { status: 403 }
      );
    }
  }

  const asignacion = await prisma.internacionMedicoTratante.findUnique({
    where: {
      internacionId_medicoId: { internacionId, medicoId },
    },
  });
  if (!asignacion) {
    return NextResponse.json(
      { error: "Este médico no es tratante de esta internación" },
      { status: 404 }
    );
  }

  const tratantesCount = await prisma.internacionMedicoTratante.count({
    where: { internacionId },
  });
  if (tratantesCount <= 1) {
    return NextResponse.json(
      { error: "No se puede eliminar el único médico tratante. Asigne otro primero." },
      { status: 400 }
    );
  }

  await prisma.internacionMedicoTratante.delete({
    where: {
      internacionId_medicoId: { internacionId, medicoId },
    },
  });

  return NextResponse.json({ ok: true });
}
