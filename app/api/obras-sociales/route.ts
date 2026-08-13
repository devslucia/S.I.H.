import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "FACTURACION", "ADMISION"];

const MULTIPLICADORES_CUIT = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

function cuitValido(cuit: string): boolean {
  const c = cuit.replace(/\D/g, "");
  if (!/^\d{11}$/.test(c)) return false;
  const dv = Number(c[10]);
  let suma = 0;
  for (let i = 0; i < 10; i++) suma += Number(c[i]) * MULTIPLICADORES_CUIT[i];
  const resto = suma % 11;
  const calc = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto;
  return calc === dv;
}

const obraSocialSchema = z.object({
  codigo: z.string().trim().min(1, "codigo requerido"),
  nombre: z.string().trim().min(1, "nombre requerido"),
  sigla: z.string().trim().min(1, "sigla requerida"),
  descripcion: z.string().trim().min(1, "descripcion requerida"),
  razonSocial: z.string().trim().min(1, "razonSocial requerida"),
  domicilio: z.string().trim().optional().nullable(),
  localidad: z.string().trim().optional().nullable(),
  tipoContribucion: z.enum(["INSCRIPTO", "NO_INSCRIPTO", "EXENTO", "MONOTRIBUTO", "CONSUMIDOR_FINAL"]),
  tipoIva: z.enum(["IVA_0", "IVA_10_5", "IVA_21"]),
  cuit: z.string().trim().refine((v) => cuitValido(v), { message: "CUIT inválido" }),
  estadoAmbulatorio: z.enum(["ACTIVA", "SUSPENDIDA"]),
  estadoInternacion: z.enum(["ACTIVA", "SUSPENDIDA"]),
  porcentajeDescMedicamentos: z.coerce.number().min(0, "mínimo 0").max(100, "máximo 100"),
  activa: z.boolean().optional(),
});

function serializar(obra: { porcentajeDescMedicamentos: unknown } & Record<string, unknown>) {
  return {
    ...obra,
    porcentajeDescMedicamentos: Number(obra.porcentajeDescMedicamentos),
  };
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(...ROLES);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";

  // Incluir obras sociales inactivas es gestión administrativa: solo ADMIN
  if (all && session.user.rol !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const obras = await prisma.obraSocial.findMany({
    where: all ? {} : { activa: true },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json(obras.map(serializar));
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = obraSocialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const { activa = true, ...rest } = parsed.data;

  const obra = await prisma.obraSocial.create({
    data: { ...rest, activa },
  });

  return NextResponse.json(serializar(obra), { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const putSchema = obraSocialSchema.partial().extend({ id: z.string().min(1, "id requerido") });
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const { id, ...data } = parsed.data;

  const obra = await prisma.obraSocial.update({
    where: { id },
    data,
  });

  return NextResponse.json(serializar(obra));
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  await prisma.obraSocial.update({
    where: { id },
    data: { activa: false },
  });

  return NextResponse.json({ ok: true });
}
