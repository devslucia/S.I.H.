import { prisma } from "@/lib/prisma";
import { prismaErrorCode } from "@/lib/errors";

/**
 * Garantiza que una internación tenga su HistoriaClinica (por internación),
 * la HC por paciente y el Episodio de tipo INTERNACION.
 *
 * Admisión ya crea las tres cosas; esto cubre internaciones legadas o creadas
 * por scripts para que ningún endpoint de HC devuelva 404 por datos "vacíos".
 * Idempotente y seguro ante requests concurrentes (upsert / reintento en P2002).
 *
 * Devuelve null solo si la internación no existe.
 */
export async function ensureHcEpisodio(internacionId: string) {
  const internacion = await prisma.internacion.findUnique({
    where: { id: internacionId },
    select: {
      id: true,
      pacienteId: true,
      motivoIngreso: true,
      diagnosticoCirugia: true,
      fechaIngreso: true,
    },
  });
  if (!internacion) return null;

  // Camino normal: solo lecturas. Se crea únicamente si falta (internaciones legadas).
  const hc =
    (await prisma.historiaClinica.findUnique({ where: { internacionId } })) ??
    (await prisma.historiaClinica.upsert({
      where: { internacionId },
      update: {},
      create: { internacionId },
    }));

  let episodio = await prisma.episodio.findUnique({ where: { internacionId } });
  if (!episodio) {
    const hcPaciente = await ensureHcPaciente(internacion.pacienteId);
    episodio = await prisma.episodio.upsert({
      where: { internacionId },
      update: {},
      create: {
        hcId: hcPaciente.id,
        tipo: "INTERNACION",
        internacionId,
        motivoIngreso: internacion.motivoIngreso,
        diagnostico: internacion.diagnosticoCirugia,
        estado: "EN_CURSO",
        fechaInicio: internacion.fechaIngreso,
      },
    });
  }

  return { internacion, hc, episodio };
}

async function ensureHcPaciente(pacienteId: string) {
  const existente = await prisma.historiaClinica.findFirst({
    where: { pacienteId, internacionId: null },
  });
  if (existente) return existente;
  try {
    return await prisma.historiaClinica.create({ data: { pacienteId, internacionId: null } });
  } catch (e) {
    // Índice único parcial uniq_hc_nueva_por_paciente: otro request la creó primero.
    if (prismaErrorCode(e) === "P2002") {
      const creada = await prisma.historiaClinica.findFirst({
        where: { pacienteId, internacionId: null },
      });
      if (creada) return creada;
    }
    throw e;
  }
}
