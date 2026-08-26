import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
    const { error } = await requireRole("ADMIN", "FARMACIA");
    if (error) return error;

    let body: { ids?: string[]; activo?: boolean };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
        return NextResponse.json({ error: "Se requiere un array de 'ids' no vacío" }, { status: 400 });
    }

    if (typeof body.activo !== "boolean") {
        return NextResponse.json({ error: "Se requiere un booleano 'activo'" }, { status: 400 });
    }

    // Update in bulk
    const result = await prisma.stockItem.updateMany({
        where: {
            id: { in: body.ids },
        },
        data: {
            activo: body.activo,
            updatedAt: new Date(),
        },
    });

    return NextResponse.json({ actualizados: result.count });
}
