import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** Alta de ENFERMERÍA: segundo paso del flujo de alta.
 * Solo ENFERMERO o ADMIN. Requiere que el alta médica esté completa.
 * La cama NO se libera aquí.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const { session, error } = await requireRole("ADMIN", "ENFERMERO");
    if (error) return error;

    void session; // session ya validada por requireRole

    const internacion = await prisma.internacion.findUnique({
        where: { id: params.id },
        select: { id: true, estado: true, camaId: true },
    });

    if (!internacion) {
        return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
    }

    if (internacion.estado !== "ALTA_MEDICA") {
        return NextResponse.json(
            { error: `El alta de enfermería requiere que el médico haya registrado el alta médica primero. Estado actual: ${internacion.estado}` },
            { status: 409 }
        );
    }

    await prisma.internacion.update({
        where: { id: params.id },
        data: {
            estado: "ALTA_ENFERMERIA",
            altaEnfermeriaAt: new Date(),
            // La cama NO se libera aquí
        },
    });

    return NextResponse.json({ ok: true, message: "Alta de enfermería registrada. Pendiente alta administrativa para liberar la cama." });
}
