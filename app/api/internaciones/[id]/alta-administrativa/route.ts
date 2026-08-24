import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** Alta ADMINISTRATIVA: tercer y último paso del flujo de alta.
 * Solo ADMISION o ADMIN. Requiere alta de enfermería completada.
 * Libera la cama únicamente aquí.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const { error } = await requireRole("ADMIN", "ADMISION");
    if (error) return error;

    const internacion = await prisma.internacion.findUnique({
        where: { id: params.id },
        select: { id: true, estado: true, camaId: true },
    });

    if (!internacion) {
        return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
    }

    if (internacion.estado !== "ALTA_ENFERMERIA") {
        return NextResponse.json(
            {
                error:
                    internacion.estado === "ALTA_MEDICA"
                        ? "Falta el alta de enfermería antes de poder dar el alta administrativa."
                        : `El alta administrativa requiere alta médica + alta de enfermería completadas. Estado actual: ${internacion.estado}`,
            },
            { status: 409 }
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.internacion.update({
            where: { id: params.id },
            data: {
                estado: "ALTA_ADMINISTRATIVA",
                altaAdministrativaAt: new Date(),
            },
        });

        // Liberación de cama: SOLO en el alta administrativa (único punto correcto)
        if (internacion.camaId) {
            await tx.cama.updateMany({
                where: { id: internacion.camaId, estado: "OCUPADA" },
                data: { estado: "LIBRE" },
            });
        }
    });

    return NextResponse.json({ ok: true, message: "Alta administrativa registrada. Cama liberada." });
}
