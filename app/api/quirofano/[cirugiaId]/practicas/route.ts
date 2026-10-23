import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { calcularImportesNomenclador, getGalenoVigente, resolverPractica } from "@/lib/galeno";

async function checkAssignment(userId: string, cirugiaId: string) {
  const cirugia = await prisma.cirugia.findUnique({
    where: { id: cirugiaId },
    select: { instrumentadorId: true, circulanteId: true, cirujanoId: true, ayudante1Id: true, ayudante2Id: true },
  });
  if (!cirugia) return NextResponse.json({ error: "Cirugía no encontrada" }, { status: 404 });
  if (
    cirugia.instrumentadorId === userId ||
    cirugia.circulanteId === userId ||
    cirugia.cirujanoId === userId ||
    cirugia.ayudante1Id === userId ||
    cirugia.ayudante2Id === userId
  ) return null;
  return NextResponse.json({ error: "No asignado a esta cirugía" }, { status: 403 });
}

export async function POST(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const { session, error } = await requireRole("ADMIN", "MEDICO", "ENFERMERO", "INSTRUMENTADOR");
  if (error) return error;

  if (session.user.rol !== "ADMIN") {
    const denied = await checkAssignment(session.user.id, params.cirugiaId);
    if (denied) return denied;
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.practica !== "string" || !body.practica.trim()) {
    return NextResponse.json({ error: "Indicá el código o nombre de la práctica" }, { status: 400 });
  }
  const fechaPractica = body.fecha && !Number.isNaN(new Date(body.fecha).getTime()) ? new Date(body.fecha) : new Date();

  // La falta de configuración de facturación (galeno) no bloquea el registro clínico:
  // el cargo se crea a $0 y se informa para que Facturación lo valorice.
  let advertencia: string | null = null;

  const result = await prisma.$transaction(async (tx) => {
    const practica = await tx.practicaCirugia.create({
      data: {
        cirugiaId: params.cirugiaId,
        fecha: fechaPractica,
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
            const galeno = await getGalenoVigente(tx, internacion.obraSocialId, fechaPractica);
            if (!galeno) {
              advertencia =
                "Práctica registrada, pero falta configurar el galeno de la obra social para esa fecha: el cargo quedó en $0 (Configuración → Galenos por obra social).";
            } else {
              const importes = calcularImportesNomenclador(item.unidades, galeno);
              precioUnitario = importes.total;
              total = precioUnitario;
              Object.assign(desglose, {
                nomencladorId: item.nomencladorId ?? undefined,
                galenoQx: Number(galeno.galenoQx),
                honorariosEspecialista: importes.honorariosEspecialista,
                honorariosAyudantes: importes.honorariosAyudantes,
                honorariosAnestesista: importes.honorariosAnestesista,
                gastosPractica: importes.gastosPractica,
              });
            }
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

  return NextResponse.json({ ...result, advertencia }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { cirugiaId: string } }) {
  const { session, error } = await requireRole("ADMIN", "MEDICO", "ENFERMERO", "INSTRUMENTADOR");
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
