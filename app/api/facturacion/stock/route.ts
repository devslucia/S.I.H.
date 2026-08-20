import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export interface ResultadoBusquedaStock {
  id: string;
  nTroquel: string | null;
  nombre: string;
  presentacion: string | null;
  laboratorio: string | null;
  principioActivo: string | null;
  precioVenta: number | null;
  precioUnidadVenta: number | null;
  fraccion: number | null;
  unidad: string;
}

/**
 * Búsqueda de medicamentos de stock para facturación de medicación.
 * Busca por troquel, nombre, presentación, laboratorio o principio activo (insensitive).
 */
export async function GET(req: NextRequest) {
  const { error } = await requireRole("ADMIN", "FACTURACION");
  if (error) return error;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json([]);

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
    orderBy: { nombre: "asc" },
    take: 15,
  });

  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  const resultado: ResultadoBusquedaStock[] = items.map((i) => ({
    id: i.id,
    nTroquel: i.nTroquel,
    nombre: i.nombre,
    presentacion: i.presentacion,
    laboratorio: i.laboratorio,
    principioActivo: i.principioActivo,
    precioVenta: num(i.precioVenta),
    precioUnidadVenta: num(i.precioUnidadVenta),
    fraccion: i.fraccion,
    unidad: i.unidad,
  }));

  return NextResponse.json(resultado);
}