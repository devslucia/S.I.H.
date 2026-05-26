import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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

  const grouped = cargos.reduce<Record<string, { internacion: any; cargos: any[]; total: number }>>(
    (acc, cargo) => {
      const key = cargo.internacionId;
      if (!acc[key]) {
        acc[key] = {
          internacion: cargo.internacion,
          cargos: [],
          total: 0,
        };
      }
      acc[key].cargos.push(cargo);
      acc[key].total += Number(cargo.total);
      return acc;
    },
    {}
  );

  return NextResponse.json(Object.values(grouped));
}
