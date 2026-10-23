import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {NextResponse} from "next/server";

// ADMISION lo necesita para asignar médico tratante al admitir (antes: 403 → selector vacío).
export async function GET() {
  const { session, error } = await requireRole("ADMIN", "MEDICO", "ADMISION");
  if (error) return error;

  const medicos = await prisma.usuario.findMany({
    where: {
      rol: { in: ["MEDICO", "ANESTESIOLOGO"] },
      activo: true,
    },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: session.user.rol === "ADMIN",
      matricula: true,
      especialidad: true,
    },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json(medicos);
}
