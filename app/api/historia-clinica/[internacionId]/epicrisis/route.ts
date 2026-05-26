import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
  });

  if (!hc) {
    return NextResponse.json({ error: "Historia clínica no encontrada" }, { status: 404 });
  }

  const epicrisis = await prisma.epicrisis.findUnique({
    where: { hcId: hc.id },
  });

  return NextResponse.json(epicrisis ?? {});
}

export async function PUT(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hc = await prisma.historiaClinica.findUnique({
    where: { internacionId: params.internacionId },
  });

  if (!hc) {
    return NextResponse.json({ error: "Historia clínica no encontrada" }, { status: 404 });
  }

  const body = await req.json();

  const epicrisis = await prisma.epicrisis.upsert({
    where: { hcId: hc.id },
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
