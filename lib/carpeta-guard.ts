import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { EstadoCarpeta } from "@prisma/client";

/**
 * Verifica que la carpeta de una internación esté ABIERTA antes de
 * permitir alta/edición/borrado de cargos.
 * Retorna `{ ok: true }` si está abierta, o `{ ok: false, response }` si no.
 */
export async function assertCarpetaAbierta(internacionId: string): Promise<
    | { ok: true }
    | { ok: false; response: ReturnType<typeof NextResponse.json> }
> {
    const internacion = await prisma.internacion.findUnique({
        where: { id: internacionId },
        select: { estadoCarpeta: true },
    });

    if (!internacion) {
        return {
            ok: false,
            response: NextResponse.json({ error: "Internación no encontrada" }, { status: 404 }),
        };
    }

    if (internacion.estadoCarpeta !== "ABIERTA") {
        const label: Record<EstadoCarpeta, string> = {
            ABIERTA: "Abierta",
            CERRADA: "Carpeta cerrada",
            ENVIADA: "Enviada",
            LIQUIDADA: "Liquidada",
        };
        return {
            ok: false,
            response: NextResponse.json(
                {
                    error: `La carpeta está ${label[internacion.estadoCarpeta]}. Reabrí la carpeta para cargar o editar cargos.`,
                    estadoCarpeta: internacion.estadoCarpeta,
                },
                { status: 409 }
            ),
        };
    }

    return { ok: true };
}
