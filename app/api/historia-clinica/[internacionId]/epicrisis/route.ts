import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";

const EPICRISIS_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "INSTRUMENTADOR"];

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...EPICRISIS_READ_ROLES);
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
  });

  if (!hc) {
    return NextResponse.json({ error: "Historia clínica no encontrada" }, { status: 404 });
  }

  const episodio = await prisma.episodio.findFirst({
    where: { internacionId: params.internacionId },
  });

  const epicrisis = episodio
    ? await prisma.epicrisis.findUnique({ where: { episodioId: episodio.id } })
    : null;

  return NextResponse.json(epicrisis ?? {});
}

export async function PUT(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole("ADMIN", "MEDICO");
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
  });

  if (!hc) {
    return NextResponse.json({ error: "Historia clínica no encontrada" }, { status: 404 });
  }

  const episodio = await prisma.episodio.findFirst({
    where: { internacionId: params.internacionId },
  });

  if (!episodio) {
    return NextResponse.json(
      { error: "No se encontró el episodio clínico para esta internación" },
      { status: 404 }
    );
  }

  if (episodio.tipo !== "INTERNACION") {
    return NextResponse.json(
      { error: "La epicrisis solo está disponible para episodios de tipo INTERNACION" },
      { status: 400 }
    );
  }

  const body = await req.json();

  const epicrisis = await prisma.epicrisis.upsert({
    where: { episodioId: episodio.id },
    update: {
      diagIngreso: body.diagIngreso,
      diagEgreso: body.diagEgreso,
      codigosCIE: body.codigosCIE,
      resumenClinico: body.resumenClinico,
      estudiosRealizados: body.estudiosRealizados,
      tratamientosRealizados: body.tratamientosRealizados,
      proximoControlFecha: body.proximoControlFecha ? new Date(body.proximoControlFecha) : undefined,
      proximoControlLugar: body.proximoControlLugar,
      proximoControlMedico: body.proximoControlMedico,
      pendiente: body.pendiente,
      condicionEgreso: body.condicionEgreso,
      destino: body.destino,
      medicacionAlta: body.medicacionAlta,
      indicacionesAlta: body.indicacionesAlta,
      medicoId: body.medicoId,
    },
    create: {
      hcId: hc.id,
      episodioId: episodio.id,
      diagIngreso: body.diagIngreso,
      diagEgreso: body.diagEgreso,
      codigosCIE: body.codigosCIE ?? [],
      resumenClinico: body.resumenClinico,
      estudiosRealizados: body.estudiosRealizados,
      tratamientosRealizados: body.tratamientosRealizados,
      proximoControlFecha: body.proximoControlFecha ? new Date(body.proximoControlFecha) : undefined,
      proximoControlLugar: body.proximoControlLugar,
      proximoControlMedico: body.proximoControlMedico,
      pendiente: body.pendiente,
      condicionEgreso: body.condicionEgreso,
      destino: body.destino,
      medicacionAlta: body.medicacionAlta ?? [],
      indicacionesAlta: body.indicacionesAlta,
      medicoId: body.medicoId,
    },
  });

  return NextResponse.json(epicrisis);
}
