import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "FARMACIA", "ENFERMERO", "INSTRUMENTADOR", "MEDICO", "ANESTESIOLOGO");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  // precioCompra es información sensible de costos: solo ADMIN/FARMACIA
  const conPrecioCompra = ["ADMIN", "FARMACIA"].includes(session.user.rol);

  const items = await prisma.stockItem.findMany({
    where: {
      activo: true,
      OR: [
        { nTroquel: { contains: q, mode: "insensitive" } },
        { nombre: { contains: q, mode: "insensitive" } },
        { presentacion: { contains: q, mode: "insensitive" } },
        { laboratorio: { contains: q, mode: "insensitive" } },
        { principioActivo: { contains: q, mode: "insensitive" } },
      ],
    },
    select: conPrecioCompra
      ? undefined
      : {
          id: true,
          nTroquel: true,
          nombre: true,
          presentacion: true,
          laboratorio: true,
          principioActivo: true,
          unidad: true,
          stockActual: true,
          stockMinimo: true,
          stockMaximo: true,
          lote: true,
          vencimiento: true,
          ubicacion: true,
          nomencladorCodigo: true,
          precioVenta: true,
          fraccion: true,
          precioUnidadVenta: true,
          activo: true,
          createdAt: true,
          updatedAt: true,
        },
    orderBy: { nombre: "asc" },
    take: 20,
  });

  return NextResponse.json(items);
}
