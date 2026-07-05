import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createUsuarioSchema } from "@/lib/validations/usuario.schema";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET() {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const usuarios = await prisma.usuario.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, email: true, rol: true, matricula: true, especialidad: true },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json(usuarios);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json();
  const parsed = createUsuarioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.usuario.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

  const usuario = await prisma.usuario.create({
    data: {
      nombre: parsed.data.nombre,
      email: parsed.data.email,
      password: hashedPassword,
      rol: parsed.data.rol,
      matricula: parsed.data.matricula ?? null,
      especialidad: parsed.data.especialidad ?? null,
    },
    select: { id: true, nombre: true, email: true, rol: true, matricula: true, especialidad: true },
  });

  return NextResponse.json(usuario, { status: 201 });
}
