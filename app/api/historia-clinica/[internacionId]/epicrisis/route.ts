import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ensureHcEpisodio } from "@/lib/hc-context";
import { internacionAccessError } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";
import { CondicionEgreso, DestinoEgreso } from "@prisma/client";

const CONDICIONES: string[] = Object.values(CondicionEgreso);
const DESTINOS: string[] = Object.values(DestinoEgreso);

const EPICRISIS_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "INSTRUMENTADOR"];

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...EPICRISIS_READ_ROLES);
  if (error) return error;

  const accesoError = await internacionAccessError(params.internacionId, session.user.id, session.user.rol);
  if (accesoError) return accesoError;

  const ctx = await ensureHcEpisodio(params.internacionId);
  if (!ctx) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }
  const { episodio } = ctx;

  const epicrisis = await prisma.epicrisis.findUnique({ where: { episodioId: episodio.id } });

  return NextResponse.json(epicrisis ?? {});
}

export async function PUT(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole("ADMIN", "MEDICO");
  if (error) return error;

  const accesoError = await internacionAccessError(params.internacionId, session.user.id, session.user.rol);
  if (accesoError) return accesoError;

  const ctx = await ensureHcEpisodio(params.internacionId);
  if (!ctx) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }
  const { hc, episodio } = ctx;

  if (episodio.tipo !== "INTERNACION") {
    return NextResponse.json(
      { error: "La epicrisis solo está disponible para episodios de tipo INTERNACION" },
      { status: 400 }
    );
  }

  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }
  // Los selects del form envían "" cuando no se eligió opción: Prisma rechaza "" en enums.
  const body = {
    ...raw,
    condicionEgreso: CONDICIONES.includes(raw.condicionEgreso) ? raw.condicionEgreso : null,
    destino: DESTINOS.includes(raw.destino) ? raw.destino : null,
    codigosCIE: Array.isArray(raw.codigosCIE) ? raw.codigosCIE : undefined,
    medicacionAlta: Array.isArray(raw.medicacionAlta) ? raw.medicacionAlta : undefined,
  };

  const existente = await prisma.epicrisis.findUnique({
    where: { episodioId: episodio.id },
    select: { firmadaAt: true },
  });

  if (existente?.firmadaAt) {
    return NextResponse.json({ error: "La epicrisis está firmada y no puede modificarse" }, { status: 403 });
  }

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
      medicoId: session.user.id,
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
      medicoId: session.user.id,
    },
  });

  return NextResponse.json(epicrisis);
}
