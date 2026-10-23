import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ensureHcEpisodio } from "@/lib/hc-context";
import { internacionAccessError } from "@/lib/internaciones-visibility";
import { descontarStock, type Tx } from "@/lib/utils/stock";
import { generarCargo } from "@/lib/utils/facturacion";
import { NextRequest, NextResponse } from "next/server";
import { errorMessage } from "@/lib/errors";
import { TipoControl } from "@prisma/client";

const TIPOS_CONTROL: string[] = Object.values(TipoControl);

const ENFERMERIA_READ_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];

export async function GET(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole(...ENFERMERIA_READ_ROLES);
  if (error) return error;

  const accesoError = await internacionAccessError(params.internacionId, session.user.id, session.user.rol);
  if (accesoError) return accesoError;

  const ctx = await ensureHcEpisodio(params.internacionId);
  if (!ctx) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }
  const { hc } = ctx;

  const controles = await prisma.controlEnfermeria.findMany({
    where: { hcId: hc.id },
    include: { usuario: { select: { id: true, nombre: true } } },
    orderBy: [{ fecha: "desc" }, { hora: "desc" }, { id: "desc" }],
  });

  return NextResponse.json(controles);
}

export async function POST(req: NextRequest, { params }: { params: { internacionId: string } }) {
  const { session, error } = await requireRole("ADMIN", "ENFERMERO");
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
      { error: "Los controles de enfermería solo están disponibles para episodios de tipo INTERNACION" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }
  if (!TIPOS_CONTROL.includes(body.tipo)) {
    return NextResponse.json({ error: "Tipo de control inválido" }, { status: 400 });
  }
  if (typeof body.hora !== "string" || !body.hora.trim()) {
    return NextResponse.json({ error: "La hora del control es obligatoria" }, { status: 400 });
  }

  if (Array.isArray(body.hojasEnfermeria)) {
    for (const hoja of body.hojasEnfermeria) {
      if (hoja.stockItemId && hoja.cantidad != null) {
        const cant = Number(hoja.cantidad);
        if (!Number.isFinite(cant) || cant <= 0) {
          return NextResponse.json(
            { error: `La cantidad del ítem "${hoja.item ?? ""}" debe ser mayor a 0` },
            { status: 400 }
          );
        }
      }
    }
  }

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const alertas: string[] = [];

      if (body.tipo === "SIGNOS_VITALES" && body.datos) {
        const rangos = await tx.rangoVital.findMany();
        for (const rango of rangos) {
          const valor = body.datos[rango.parametro] || body.datos[rango.parametro.replace("°", "")];
          if (valor !== undefined && valor !== null && valor !== "") {
            const numVal = parseFloat(String(valor).replace(",", "."));
            if (!isNaN(numVal)) {
              if (numVal < rango.minimo || numVal > rango.maximo) {
                alertas.push(`${rango.parametro}: ${numVal} ${rango.unidad} (normal: ${rango.minimo}-${rango.maximo})`);
              }
            }
          }
        }
      }

      const created = await tx.controlEnfermeria.create({
        data: {
          hcId: hc.id,
          episodioId: episodio.id,
          hora: body.hora,
          tipo: body.tipo,
          datos: body.datos ?? {},
          observacion: body.observacion,
          alertas: alertas.length > 0 ? alertas : undefined,
          usuarioId: session.user.id,
        },
      });

      const control = await tx.controlEnfermeria.findUnique({
        where: { id: created.id },
        include: { usuario: { select: { id: true, nombre: true } } },
      });

      if (body.hojasEnfermeria && Array.isArray(body.hojasEnfermeria)) {
        for (const hoja of body.hojasEnfermeria) {
          const created = await tx.hojaEnfermeria.create({
            data: {
              hcId: hc.id,
              episodioId: episodio.id,
              fecha: new Date(hoja.fecha),
              seccion: hoja.seccion,
              item: hoja.item,
              dosis: hoja.dosis,
              via: hoja.via,
              marcasHorarias: hoja.marcasHorarias ?? {},
              stockItemId: hoja.stockItemId,
            },
          });

          if (hoja.stockItemId && hoja.cantidad) {
            await descontarStock(
              tx,
              hoja.stockItemId,
              Number(hoja.cantidad),
              `Hoja de enfermería: ${hoja.item}`,
              params.internacionId
            );
          }

          await generarCargo(tx as Tx, {
            internacionId: params.internacionId,
            concepto: `${hoja.seccion} - ${hoja.item}`,
            cantidad: hoja.cantidad ?? 1,
            precioUnitario: 0,
            origen: "MATERIAL",
            hojaEnfermeriaId: created.id,
          });
        }
      }

      return control;
    });
  } catch (e: unknown) {
    const msg = errorMessage(e);
    if (msg?.startsWith("Stock insuficiente")) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    console.error("Error en POST enfermería:", e);
    return NextResponse.json({ error: "Error interno al guardar el control de enfermería" }, { status: 500 });
  }

  return NextResponse.json(result, { status: 201 });
}
