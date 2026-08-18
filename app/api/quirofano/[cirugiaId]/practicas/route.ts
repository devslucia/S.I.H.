import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { calcularImportesNomenclador, getGalenoVigente, normalizarItemNacional, resolverPractica } from "@/lib/galeno";

async function checkAssignment(userId: string, cirugiaId: string) {
  const cirugia = await prisma.cirugia.findUnique({
    where: { id: cirugiaId },
    select: { instrumentadorId: true, circulanteId: true },
  });
  if (!cirugia) return NextResponse.json({ error: "Cirugía no encontrada" }, { status: 404 });
  if (cirugia.instrumentadorId === userId || cirugia.circulanteId === userId) return null;
  return NextResponse.json({ error: "No asignado a esta cirugía" }, { status: 403 });
}

export async function POST(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const { session, error } = await requireRole("ADMIN", "ENFERMERO", "INSTRUMENTADOR");
  if (error) return error;

  if (session.user.rol !== "ADMIN") {
    const denied = await checkAssignment(session.user.id, params.cirugiaId);
    if (denied) return denied;
  }

  const body = await req.json();
  const result = await prisma.$transaction(async (tx) => {
    const practica = await tx.practicaCirugia.create({
      data: {
        cirugiaId: params.cirugiaId,
        fecha: new Date(body.fecha),
        hora: body.hora,
        practica: body.practica,
        laboratorio: body.laboratorio,
        cargoPor: body.cargoPor,
        actoQuirurgico: body.actoQuirurgico,
      },
    });

    const cirugia = await tx.cirugia.findUnique({
      where: { id: params.cirugiaId },
      select: { internacionId: true },
    });
    if (cirugia) {
      // Cálculo automático por galeno: se resuelve la práctica contra la
      // obra social de la internación (específica de esa OS primero, luego
      // nacional) y se aplica el galeno vigente en la fecha de la práctica.
      const codigo = String(body.practica ?? "").trim();
      let precioUnitario = 0;
      let total = 0;
      const desglose: {
        nomencladorId?: string;
        galenoQx?: number;
        honorariosEspecialista?: number;
        honorariosAyudantes?: number;
        honorariosAnestesista?: number;
        gastosPractica?: number;
      } = {};

      if (codigo) {
        const internacion = await tx.internacion.findUnique({
          where: { id: cirugia.internacionId },
          select: { obraSocialId: true },
        });

        if (internacion?.obraSocialId) {
          const item = await resolverPractica(tx, codigo, internacion.obraSocialId);
          if (item) {
            const fechaPrestacion = new Date(body.fecha);
            const galeno = await getGalenoVigente(tx, internacion.obraSocialId, fechaPrestacion);
            if (!galeno) {
              return NextResponse.json(
                {
                  error: "Falta configurar galeno para esta obra social en la fecha de la práctica. Revisá Configuración → Galenos por obra social.",
                },
                { status: 400 }
              );
            }
            const importes = calcularImportesNomenclador(normalizarItemNacional(item), galeno);
            precioUnitario = importes.total;
            total = precioUnitario;
            Object.assign(desglose, {
              nomencladorId: item.id,
              galenoQx: Number(galeno.galenoQx),
              honorariosEspecialista: importes.honorariosEspecialista,
              honorariosAyudantes: importes.honorariosAyudantes,
              honorariosAnestesista: importes.honorariosAnestesista,
              gastosPractica: importes.gastosPractica,
            });
          }
        }
      }

      await tx.cargoFacturacion.create({
        data: {
          internacionId: cirugia.internacionId,
          concepto: `Práctica: ${body.practica}`,
          cantidad: 1,
          precioUnitario,
          total,
          origen: "PRACTICA",
          ...desglose,
        },
      });
    }

    return practica;
  });

  return NextResponse.json(result, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const { session, error } = await requireRole("ADMIN", "ENFERMERO", "INSTRUMENTADOR");
  if (error) return error;

  if (session.user.rol !== "ADMIN") {
    const denied = await checkAssignment(session.user.id, params.cirugiaId);
    if (denied) return denied;
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const practica = await prisma.practicaCirugia.findUnique({ where: { id } });
  if (!practica) return NextResponse.json({ error: "Práctica no encontrada" }, { status: 404 });
  if (practica.cirugiaId !== params.cirugiaId) {
    return NextResponse.json({ error: "La práctica no pertenece a esta cirugía" }, { status: 403 });
  }

  await prisma.practicaCirugia.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
