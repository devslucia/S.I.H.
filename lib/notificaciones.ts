import { PrismaClient, type Prisma } from "@prisma/client";

export type NotificacionCtx = PrismaClient | Prisma.TransactionClient;

export const NOTIFICACION_ROLES_DESTINO = ["ENFERMERO", "ADMIN"] as const;
export const TIPO_NUEVA_INDICACION = "NUEVA_INDICACION";

interface NuevaIndicacionInput {
  prescripcionId: string;
  pacienteId: string;
  internacionId: string;
  episodioId: string | null;
  pacienteApellido: string;
  pacienteNombre: string;
  detalle: string;
}

export async function crearNotificacionesPrescripcion(
  ctx: NotificacionCtx,
  input: NuevaIndicacionInput
): Promise<void> {
  const destinatarios = await ctx.usuario.findMany({
    where: { activo: true, rol: { in: [...NOTIFICACION_ROLES_DESTINO] } },
    select: { id: true },
  });

  if (destinatarios.length === 0) return;

  const mensaje = `${input.pacienteApellido}, ${input.pacienteNombre} — ${input.detalle}`;

  await ctx.notificacion.createMany({
    data: destinatarios.map((u) => ({
      userId: u.id,
      titulo: "Nueva indicación",
      mensaje,
      link: `/historia-clinica/${input.internacionId}/enfermeria`,
      tipo: TIPO_NUEVA_INDICACION,
      refId: input.prescripcionId,
      metadata: {
        prescripcionId: input.prescripcionId,
        pacienteId: input.pacienteId,
        internacionId: input.internacionId,
        episodioId: input.episodioId,
      },
    })),
  });
}

export interface NotificacionFiltro {
  userId: string;
  rol: string;
  soloNoLeidas?: boolean;
}

export function notificacionesWhere(filtro: NotificacionFiltro): Prisma.NotificacionWhereInput {
  const where: Prisma.NotificacionWhereInput = {
    OR: [{ userId: filtro.userId }, { userId: null, rolDestino: filtro.rol }],
  };
  if (filtro.soloNoLeidas) where.leida = false;
  return where;
}