import { prisma } from "@/lib/prisma";

export async function crearAnamnesis(episodioId: string, data: any) {
  const episodio = await prisma.episodio.findUnique({ where: { id: episodioId } });
  if (!episodio) throw new Error("EPISODIO_NO_ENCONTRADO");

  return prisma.anamnesis.upsert({
    where: { episodioId },
    update: data,
    create: { hcId: episodio.hcId, episodioId, ...data },
  });
}

export async function actualizarAnamnesis(episodioId: string, data: any) {
  const episodio = await prisma.episodio.findUnique({ where: { id: episodioId } });
  if (!episodio) throw new Error("EPISODIO_NO_ENCONTRADO");

  return prisma.anamnesis.upsert({
    where: { episodioId },
    update: data,
    create: { hcId: episodio.hcId, episodioId, ...data },
  });
}

export async function crearEvolucion(episodioId: string, data: any, usuarioId: string) {
  const episodio = await prisma.episodio.findUnique({ where: { id: episodioId } });
  if (!episodio) throw new Error("EPISODIO_NO_ENCONTRADO");

  return prisma.evolucion.create({
    data: { hcId: episodio.hcId, episodioId, contenido: data.contenido, usuarioId },
  });
}

export async function crearPrescripcion(episodioId: string, data: any, usuarioId: string) {
  const episodio = await prisma.episodio.findUnique({ where: { id: episodioId } });
  if (!episodio) throw new Error("EPISODIO_NO_ENCONTRADO");

  return prisma.prescripcion.create({
    data: { hcId: episodio.hcId, episodioId, ...data, usuarioId },
  });
}

export async function obtenerDocumentosEpisodio(episodioId: string) {
  const episodio = await prisma.episodio.findUnique({
    where: { id: episodioId },
    include: {
      anamnesis: true,
      evoluciones: { include: { usuario: { select: { id: true, nombre: true, apellido: true } } }, orderBy: { fecha: "desc" } },
      prescripciones: { include: { usuario: { select: { id: true, nombre: true, apellido: true } } }, orderBy: { fecha: "desc" } },
    },
  });
  if (!episodio) throw new Error("EPISODIO_NO_ENCONTRADO");

  return {
    anamnesis: episodio.anamnesis ?? null,
    evoluciones: episodio.evoluciones,
    prescripciones: episodio.prescripciones,
  };
}
