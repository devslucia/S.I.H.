import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
import { protocoloAnestesiaSchema } from "@/lib/validations/protocolo-anestesia";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

const JSON_NULL_FIELDS = ["premedicacion", "signosVitaPreop", "signosVitales", "liquidosIngresados"] as const;

function jsonSafe(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null && (JSON_NULL_FIELDS as readonly string[]).includes(key)) {
      out[key] = Prisma.JsonNull;
    } else {
      out[key] = value;
    }
  }
  return out;
}

const PA_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];

function calcularIMC(peso?: number | null, talla?: number | null): number | null {
  if (!peso || !talla || peso <= 0 || talla <= 0) return null;
  const tallaMetros = talla >= 3 ? talla / 100 : talla;
  const imc = peso / (tallaMetros * tallaMetros);
  if (!Number.isFinite(imc) || imc <= 0) return null;
  return Math.round(imc * 10) / 10;
}

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...PA_READ_ROLES);
  if (error) return error;

  if (!(await isInternacionVisibleForUser(params.internacionId, session.user.id, session.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  const episodio = await prisma.episodio.findFirst({
    where: { internacionId: params.internacionId },
    include: {
      internacion: {
        include: {
          paciente: { include: { alergias: true } },
          cama: { include: { sector: true } },
          obraSocial: true,
        },
      },
    },
  });

  if (!episodio) {
    return NextResponse.json({ error: "No se encontró el episodio clínico para esta internación" }, { status: 404 });
  }

  const protocolo = await prisma.protocoloAnestesia.findUnique({
    where: { episodioId: episodio.id },
    include: { drogas: true },
  });

  const cirugia = await prisma.cirugia.findFirst({
    where: { internacionId: params.internacionId },
    select: {
      id: true,
      anestesiologoId: true,
      cirujanoId: true,
      ayudante1Id: true,
      ayudante2Id: true,
      horaInicio: true,
      horaFin: true,
    },
  });

  let anestesiologoAsignado: { nombre: string; matricula: string | null } | null = null;
  if (cirugia?.anestesiologoId) {
    const anestesiologo = await prisma.usuario.findUnique({
      where: { id: cirugia.anestesiologoId },
      select: { nombre: true, apellido: true, matricula: true },
    });
    if (anestesiologo) {
      anestesiologoAsignado = {
        nombre: `${anestesiologo.nombre} ${anestesiologo.apellido ?? ""}`.trim(),
        matricula: anestesiologo.matricula,
      };
    }
  }

  // Equipo quirúrgico de la cirugía (fuente de verdad; el form lo muestra solo lectura)
  const equipoIds = [cirugia?.cirujanoId, cirugia?.ayudante1Id, cirugia?.ayudante2Id].filter(
    (v): v is string => Boolean(v)
  );
  const equipoUsuarios = equipoIds.length
    ? await prisma.usuario.findMany({
        where: { id: { in: equipoIds } },
        select: { id: true, nombre: true, apellido: true, matricula: true },
      })
    : [];
  const equipoMap = new Map(equipoUsuarios.map((u) => [u.id, u]));
  const nombreDe = (id?: string | null) => {
    const u = id ? equipoMap.get(id) : undefined;
    return u ? `${u.nombre} ${u.apellido ?? ""}`.trim() : null;
  };
  const equipoCirugia = {
    cirujano: cirugia?.cirujanoId
      ? {
          nombre: nombreDe(cirugia.cirujanoId),
          matricula: cirugia.cirujanoId ? equipoMap.get(cirugia.cirujanoId)?.matricula ?? null : null,
        }
      : null,
    ayudantes: [cirugia?.ayudante1Id, cirugia?.ayudante2Id]
      .filter((v): v is string => Boolean(v))
      .map((id) => ({
        nombre: nombreDe(id),
        matricula: equipoMap.get(id)?.matricula ?? null,
      }))
      .filter((a) => a.nombre != null),
    hayEquipo: Boolean(cirugia?.cirujanoId || cirugia?.ayudante1Id || cirugia?.ayudante2Id),
  };

  return NextResponse.json({
    protocolo: protocolo ?? null,
    anestesiologoAsignado,
    equipoCirugia,
    tiemposCirugia: { inicio: cirugia?.horaInicio ?? null, fin: cirugia?.horaFin ?? null },
    paciente: episodio.internacion?.paciente ?? null,
    internacion: episodio.internacion ? {
      id: episodio.internacion.id,
      numero: episodio.internacion.numero,
      fechaIngreso: episodio.internacion.fechaIngreso,
      cama: episodio.internacion.cama,
      obraSocial: episodio.internacion.obraSocial,
    } : null,
  });
}

export async function PUT(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole("ADMIN", "ANESTESIOLOGO");
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
      { error: "El protocolo de anestesia solo está disponible para episodios de tipo INTERNACION" },
      { status: 400 }
    );
  }

  const existente = await prisma.protocoloAnestesia.findUnique({
    where: { episodioId: episodio.id },
    select: { firmado: true },
  });

  if (existente?.firmado) {
    return NextResponse.json({ error: "El protocolo está firmado y no puede modificarse" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = protocoloAnestesiaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalle: parsed.error.issues[0]?.message ?? "Error de validación" },
      { status: 400 }
    );
  }

  const { drogas, imc: _imcCliente, ...campos } = parsed.data;

  // Legacy: derivar tecnicaAnestesia desde el tipo elegido para no romper lecturas viejas
  // (PDF "Técnica", carpeta completa) que siguen consumiendo el array conductiva/general.
  if (campos.tipoAnestesia === "General") {
    campos.tecnicaAnestesia = ["general"];
  } else if (campos.tipoAnestesia === "Combinada (general + regional)") {
    campos.tecnicaAnestesia = ["general", "conductiva"];
  } else if (campos.tipoAnestesia && campos.tipoAnestesia !== "Otra") {
    campos.tecnicaAnestesia = ["conductiva"];
  }

  const imc = calcularIMC(campos.peso, campos.talla);
  const dataSeguro = jsonSafe({
    ...campos,
    imc,
    // El form puede enviar "" cuando el protocolo no tiene fecha de cirugía;
    // Prisma rechaza el string vacío en DateTime? (500 en cada autoguardado).
    fechaCirugia: campos.fechaCirugia ? new Date(campos.fechaCirugia) : null,
  });

  const cirugia = await prisma.cirugia.findFirst({
    where: { internacionId: params.internacionId },
    select: { id: true, cirujanoId: true, ayudante1Id: true, ayudante2Id: true },
  });

  // Fuente de verdad del equipo quirúrgico: la cirugía.
  // Se sobrescriben los campos legacy del protocolo para no romper lecturas viejas
  // (PDF, carpeta completa) y porque el form ya no los edita.
  const equipoIds = [cirugia?.cirujanoId, cirugia?.ayudante1Id, cirugia?.ayudante2Id].filter(
    (v): v is string => Boolean(v)
  );
  const equipoUsuarios = equipoIds.length
    ? await prisma.usuario.findMany({
        where: { id: { in: equipoIds } },
        select: { id: true, nombre: true, apellido: true, matricula: true },
      })
    : [];
  const equipoMap = new Map(equipoUsuarios.map((u) => [u.id, u]));
  const nombreDe = (id?: string | null) => {
    const u = id ? equipoMap.get(id) : undefined;
    return u ? `${u.nombre} ${u.apellido ?? ""}`.trim() : null;
  };
  campos.cirujano = cirugia?.cirujanoId ? nombreDe(cirugia.cirujanoId) ?? null : null;
  campos.matriculaCirujano = cirugia?.cirujanoId ? equipoMap.get(cirugia.cirujanoId)?.matricula ?? null : null;
  campos.ayudantes =
    [cirugia?.ayudante1Id, cirugia?.ayudante2Id]
      .map((id) => (id ? nombreDe(id) : null))
      .filter((v): v is string => Boolean(v))
      .join(", ") || null;

  const protocolo = await prisma.$transaction(async (tx) => {
    const result = await tx.protocoloAnestesia.upsert({
      where: { episodioId: episodio.id },
      update: { ...dataSeguro },
      create: { hcId: hc.id, episodioId: episodio.id, cirugiaId: cirugia?.id ?? null, ...dataSeguro },
    });

    if (Array.isArray(drogas)) {
      await tx.drogaAnestesia.deleteMany({ where: { protocoloId: result.id } });
      if (drogas.length > 0) {
        await tx.drogaAnestesia.createMany({
          data: drogas.map((d) => ({
            protocoloId: result.id,
            categoria: d.categoria,
            nombre: d.nombre,
            dosis: d.dosis ?? null,
            unidad: d.unidad ?? null,
            via: d.via ?? null,
            horaAdministracion: d.horaAdministracion ? new Date(d.horaAdministracion) : null,
            observaciones: d.observaciones ?? null,
          })),
        });
      }
    }

    return tx.protocoloAnestesia.findUnique({
      where: { id: result.id },
      include: { drogas: true },
    });
  });

  return NextResponse.json(protocolo);
}
