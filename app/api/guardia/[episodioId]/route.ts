import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { assertObraSocialUsable } from "@/lib/obra-social";
import { ACCIONES_GUARDIA_RBAC, esPrioridadValida, validarTransicionGuardia, type AccionGuardia } from "@/lib/guardia";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const accionSchema = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("actualizarPrioridad"), prioridad: z.number().int().min(0).max(4) }),
  z.object({ accion: z.literal("editarDatos"), motivoConsulta: z.string().trim().min(1).max(500).optional(), obraSocialId: z.string().trim().min(1).optional().nullable() }),
  z.object({ accion: z.literal("tomarAtencion") }),
  z.object({ accion: z.literal("egresar"), disposicion: z.enum(["ALTA", "INTERNACION", "DERIVACION", "OBITO"]), diagnosticoEgreso: z.string().trim().max(1000).optional() }),
  z.object({ accion: z.literal("anular"), motivo: z.string().trim().min(1, "motivo requerido").max(500) }),
  z.object({ accion: z.literal("reingresar") }),
]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ episodioId: string }> }) {
  const { episodioId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = accionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "payload inválido" }, { status: 400 });
  }
  const accion: AccionGuardia = parsed.data.accion;

  const { session, error } = await requireRole(...ACCIONES_GUARDIA_RBAC[accion]);
  if (error) return error;

  const episodio = await prisma.episodio.findUnique({
    where: { id: episodioId },
    include: {
      guardiaMeta: true,
      hc: { select: { pacienteId: true } },
    },
  });
  if (!episodio?.guardiaMeta) {
    return NextResponse.json({ error: "Episodio de guardia no encontrado" }, { status: 404 });
  }
  if (episodio.tipo !== "GUARDIA") {
    return NextResponse.json({ error: "El episodio no es de guardia" }, { status: 400 });
  }

  const transicion = validarTransicionGuardia(episodio.guardiaMeta.estadoGuardia, accion);
  if (!transicion.ok) {
    return NextResponse.json({ error: transicion.error }, { status: 400 });
  }

  const meta = episodio.guardiaMeta;

  switch (parsed.data.accion) {
    case "actualizarPrioridad": {
      if (!esPrioridadValida(parsed.data.prioridad)) {
        return NextResponse.json({ error: "Prioridad inválida (0-4)" }, { status: 400 });
      }
      await prisma.episodioGuardiaMeta.update({
        where: { id: meta.id },
        data: { prioridad: parsed.data.prioridad },
      });
      break;
    }
    case "editarDatos": {
      if (parsed.data.obraSocialId !== undefined) {
        if (parsed.data.obraSocialId === null) {
          await prisma.episodioGuardiaMeta.update({ where: { id: meta.id }, data: { obraSocialId: null } });
        } else {
          const { error: osError } = await assertObraSocialUsable(prisma, parsed.data.obraSocialId, "AMBULATORIO");
          if (osError) return NextResponse.json({ error: osError }, { status: 400 });
          await prisma.episodioGuardiaMeta.update({ where: { id: meta.id }, data: { obraSocialId: parsed.data.obraSocialId } });
        }
      }
      if (parsed.data.motivoConsulta !== undefined) {
        await prisma.episodio.update({ where: { id: episodioId }, data: { motivoIngreso: parsed.data.motivoConsulta } });
      }
      break;
    }
    case "tomarAtencion": {
      await prisma.$transaction([
        prisma.episodioGuardiaMeta.updateMany({
          where: { id: meta.id, estadoGuardia: "EN_ESPERA" },
          data: { estadoGuardia: "EN_ATENCION", medicoId: session.user.id, fechaHoraInicioAtencion: new Date() },
        }),
      ]);
      break;
    }
    case "egresar": {
      const disposicion = parsed.data.disposicion;
      const diagnosticoEgreso = parsed.data.diagnosticoEgreso ?? null;
      await prisma.$transaction(async (tx) => {
        const updated = await tx.episodioGuardiaMeta.updateMany({
          where: { id: meta.id, estadoGuardia: "EN_ATENCION" },
          data: { estadoGuardia: "ATENDIDO", fechaHoraEgreso: new Date(), disposicionEgreso: disposicion, diagnosticoEgreso },
        });
        if (updated.count === 0) {
          throw new Error("La atención ya fue cerrada");
        }
        await tx.episodio.update({
          where: { id: episodioId },
          data: { estado: "FINALIZADO", fechaFin: new Date(), diagnostico: diagnosticoEgreso },
        });
      });
      break;
    }
    case "anular": {
      await prisma.$transaction([
        prisma.episodioGuardiaMeta.updateMany({
          where: { id: meta.id, estadoGuardia: { in: ["EN_ESPERA", "EN_ATENCION"] } },
          data: { estadoGuardia: "ANULADO", motivoAnulacion: parsed.data.motivo },
        }),
        prisma.episodio.update({
          where: { id: episodioId },
          data: { estado: "CANCELADO", fechaFin: new Date() },
        }),
      ]);
      break;
    }
    case "reingresar": {
      await prisma.$transaction([
        prisma.episodioGuardiaMeta.updateMany({
          where: { id: meta.id, estadoGuardia: "ATENDIDO" },
          data: { estadoGuardia: "EN_ESPERA", fechaHoraInicioAtencion: null, fechaHoraEgreso: null, disposicionEgreso: null, medicoId: null },
        }),
        prisma.episodio.update({
          where: { id: episodioId },
          data: { estado: "EN_CURSO", fechaFin: null },
        }),
      ]);
      break;
    }
  }

  const actualizado = await prisma.episodio.findUnique({
    where: { id: episodioId },
    include: {
      guardiaMeta: {
        include: {
          obraSocial: { select: { id: true, nombre: true, sigla: true } },
          medico: { select: { id: true, nombre: true, apellido: true, matricula: true } },
        },
      },
      hc: { select: { paciente: { select: { id: true, nombre: true, apellido: true, dni: true } } } },
    },
  });

  const sugerirInternacion = parsed.data.accion === "egresar" && parsed.data.disposicion === "INTERNACION";

  return NextResponse.json({
    episodio: actualizado,
    ...(sugerirInternacion ? { sugerirInternacion: true, pacienteId: episodio.hc.pacienteId } : {}),
  });
}