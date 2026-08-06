import { requireRole } from "@/lib/rbac";
import { obtenerDisponibilidad } from "@/lib/consultorio/disponibilidad";
import { NextRequest, NextResponse } from "next/server";

const DISPONIBILIDAD_ROLES = ["ADMIN", "SECRETARIA", "MEDICO"];

export async function GET(req: NextRequest) {
  const {error} = await requireRole(...DISPONIBILIDAD_ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const medicoId = searchParams.get("medicoId");
  const fecha = searchParams.get("fecha");

  if (!medicoId || !fecha) {
    return NextResponse.json({ error: "medicoId y fecha requeridos" }, { status: 400 });
  }

  const slots = await obtenerDisponibilidad(medicoId, new Date(fecha));

  return NextResponse.json({ medicoId, fecha, slots });
}
