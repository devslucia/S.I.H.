import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "FACTURACION");
  if (error) return error;

  const cargos = await prisma.cargoFacturacion.findMany({
    include: {
      internacion: {
        include: {
          paciente: true,
          obraSocial: true,
        },
      },
    },
    orderBy: { fecha: "desc" },
  });

  const grouped = cargos.reduce<Record<string, { internacion: any; cargos: any[]; totalCargos: number }>>(
    (acc, cargo) => {
      const key = cargo.internacionId;
      if (!acc[key]) {
        acc[key] = {
          internacion: cargo.internacion,
          cargos: [],
          totalCargos: 0,
        };
      }
      acc[key].cargos.push(cargo);
      acc[key].totalCargos += Number(cargo.total);
      return acc;
    },
    {}
  );

  return NextResponse.json(Object.values(grouped));
}
