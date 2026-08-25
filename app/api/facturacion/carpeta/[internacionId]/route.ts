import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import type { EstadoCarpeta } from "@prisma/client";

/**
 * Transiciones válidas del estado de carpeta:
 *   ABIERTA   → CERRADA
 *   CERRADA   → ENVIADA | ABIERTA  (reabrir)
 *   ENVIADA   → LIQUIDADA | ABIERTA  (reabrir)
 *   LIQUIDADA → ABIERTA  (reabrir excepcional)
 */
const TRANSICIONES: Record<EstadoCarpeta, EstadoCarpeta[]> = {
    ABIERTA: ["CERRADA"],
    CERRADA: ["ENVIADA", "ABIERTA"],
    ENVIADA: ["LIQUIDADA", "ABIERTA"],
    LIQUIDADA: ["ABIERTA"],
};

const LABEL: Record<EstadoCarpeta, string> = {
    ABIERTA: "Abierta",
    CERRADA: "Carpeta cerrada",
    ENVIADA: "Enviada",
    LIQUIDADA: "Liquidada",
};

/** GET /api/facturacion/carpeta/[internacionId]
 *  Devuelve el estado actual de carpeta e historial de cambios.
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: { internacionId: string } }
) {
    const { error } = await requireRole("ADMIN", "FACTURACION");
    if (error) return error;

    const internacion = await prisma.internacion.findUnique({
        where: { id: params.internacionId },
        select: {
            estadoCarpeta: true,
            fechaCierre: true,
            fechaEnvio: true,
            fechaLiquidacion: true,
            carpetaLogs: {
                orderBy: { at: "desc" },
                take: 20,
                include: { usuario: { select: { nombre: true, apellido: true, rol: true } } },
            },
        },
    });

    if (!internacion) {
        return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
    }

    return NextResponse.json({
        estadoCarpeta: internacion.estadoCarpeta,
        fechaCierre: internacion.fechaCierre,
        fechaEnvio: internacion.fechaEnvio,
        fechaLiquidacion: internacion.fechaLiquidacion,
        transicionesPermitidas: TRANSICIONES[internacion.estadoCarpeta],
        historial: internacion.carpetaLogs,
    });
}

/** POST /api/facturacion/carpeta/[internacionId]
 *  Body: { nuevoEstado: EstadoCarpeta, motivo?: string }
 *  Ejecuta la transición si es válida, registra log y actualiza timestamps.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { internacionId: string } }
) {
    const { session, error } = await requireRole("ADMIN", "FACTURACION");
    if (error) return error;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
        return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const nuevoEstado = String(body.nuevoEstado ?? "") as EstadoCarpeta;
    const motivo = body.motivo ? String(body.motivo).trim() || null : null;

    const ESTADOS_VALIDOS: EstadoCarpeta[] = ["ABIERTA", "CERRADA", "ENVIADA", "LIQUIDADA"];
    if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
        return NextResponse.json({ error: `Estado inválido: ${nuevoEstado}` }, { status: 400 });
    }

    const internacion = await prisma.internacion.findUnique({
        where: { id: params.internacionId },
        select: { estadoCarpeta: true },
    });

    if (!internacion) {
        return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
    }

    const estadoActual = internacion.estadoCarpeta;
    const permitidos = TRANSICIONES[estadoActual];

    if (!permitidos.includes(nuevoEstado)) {
        return NextResponse.json(
            {
                error: `Transición no permitida: ${LABEL[estadoActual]} → ${LABEL[nuevoEstado]}. Transiciones válidas desde "${LABEL[estadoActual]}": ${permitidos.map((e) => LABEL[e]).join(", ")}.`,
            },
            { status: 409 }
        );
    }

    // Calcular timestamps según destino
    const fechaData: Record<string, Date | null> = {};
    if (nuevoEstado === "CERRADA") fechaData.fechaCierre = new Date();
    if (nuevoEstado === "ENVIADA") fechaData.fechaEnvio = new Date();
    if (nuevoEstado === "LIQUIDADA") fechaData.fechaLiquidacion = new Date();
    // Al reabrir limpiamos el timestamp del estado que se abandona
    if (nuevoEstado === "ABIERTA") {
        if (estadoActual === "CERRADA") fechaData.fechaCierre = null;
        if (estadoActual === "ENVIADA") fechaData.fechaEnvio = null;
        if (estadoActual === "LIQUIDADA") fechaData.fechaLiquidacion = null;
    }

    await prisma.$transaction(async (tx) => {
        await tx.internacion.update({
            where: { id: params.internacionId },
            data: { estadoCarpeta: nuevoEstado, ...fechaData },
        });

        await tx.carpetaLog.create({
            data: {
                internacionId: params.internacionId,
                estadoAnterior: estadoActual,
                estadoNuevo: nuevoEstado,
                usuarioId: session.user.id,
                motivo,
            },
        });
    });

    return NextResponse.json({
        ok: true,
        estadoCarpeta: nuevoEstado,
        message: `Carpeta actualizada: ${LABEL[estadoActual]} → ${LABEL[nuevoEstado]}`,
    });
}
