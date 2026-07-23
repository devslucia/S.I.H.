import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { updateUsuarioSchema } from "@/lib/validations/usuario.schema";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateUsuarioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.usuario.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (parsed.data.email && parsed.data.email !== existing.email) {
    const emailTaken = await prisma.usuario.findUnique({ where: { email: parsed.data.email } });
    if (emailTaken) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
    }
  }

  if (session.user.id === id && parsed.data.rol !== undefined && parsed.data.rol !== existing.rol) {
    return NextResponse.json({ error: "No podés cambiarte el rol a vos mismo" }, { status: 400 });
  }

  const updateData: Record<string, any> = {};
  if (parsed.data.nombre !== undefined) updateData.nombre = parsed.data.nombre.toLowerCase();
  if (parsed.data.apellido !== undefined) updateData.apellido = parsed.data.apellido?.toLowerCase() || null;
  if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
  if (parsed.data.rol !== undefined) updateData.rol = parsed.data.rol;
  if (parsed.data.matricula !== undefined) updateData.matricula = parsed.data.matricula;
  if (parsed.data.especialidad !== undefined) updateData.especialidad = parsed.data.especialidad;
  if (parsed.data.activo !== undefined) updateData.activo = parsed.data.activo;

  if (parsed.data.password) {
    updateData.password = await bcrypt.hash(parsed.data.password, 10);
  }

  const usuario = await prisma.usuario.update({
    where: { id },
    data: updateData,
    select: { id: true, nombre: true, apellido: true, email: true, rol: true, matricula: true, especialidad: true, activo: true },
  });

  return NextResponse.json(usuario);
}
