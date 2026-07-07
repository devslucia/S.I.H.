import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const admitirSchema = z.object({
  dni: z.string().min(7).max(11),
  apellido: z.string().min(1),
  nombre: z.string().min(1),
  sexo: z.enum(["MASCULINO", "FEMENINO", "OTRO"]),
  fechaNac: z.string().transform((v) => new Date(v)),
  cuil: z.string().optional().nullable(),
  domicilio: z.string().optional().nullable(),
  localidad: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  obraSocialId: z.string().uuid().optional().nullable(),
  nroAfiliado: z.string().optional().nullable(),
  tipoBeneficiario: z.enum(["TITULAR", "FAMILIAR"]).optional().nullable(),
  camaId: z.string().uuid().optional().nullable(),
  medicoTratanteIds: z.array(z.string().uuid()).optional().nullable(),
  tipoIngreso: z.enum(["PROGRAMADO", "URGENCIA", "GUARDIA", "DERIVACION"]),
  motivoIngreso: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "ADMISION");
  if (error) return error;

  const body = await req.json();
  const parsed = admitirSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = parsed.data;

  const existe = await prisma.paciente.findUnique({ where: { dni: data.dni } });
  if (existe) {
    return NextResponse.json({ error: "Ya existe un paciente con ese DNI" }, { status: 409 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const paciente = await tx.paciente.create({
        data: {
          dni: data.dni,
          apellido: data.apellido,
          nombre: data.nombre,
          sexo: data.sexo,
          fechaNac: data.fechaNac,
          cuil: data.cuil,
          domicilio: data.domicilio,
          localidad: data.localidad,
          provincia: data.provincia,
          telefono: data.telefono,
        },
      });

      if (data.camaId) {
        const cama = await tx.cama.findUnique({ where: { id: data.camaId } });
        if (!cama) throw new Error("CAMA_NOT_FOUND");
        if (cama.estado !== "LIBRE") throw new Error(`CAMA_NOT_AVAILABLE:${cama.estado}`);
      }

      const internacion = await tx.internacion.create({
        data: {
          pacienteId: paciente.id,
          camaId: data.camaId,
          obraSocialId: data.obraSocialId,
          nroAfiliado: data.nroAfiliado,
          tipoBeneficiario: data.tipoBeneficiario,
          tipoIngreso: data.tipoIngreso,
          motivoIngreso: data.motivoIngreso,
          medicosTratantesInternacion: data.medicoTratanteIds?.length
            ? { create: data.medicoTratanteIds.map((id) => ({ medicoId: id })) }
            : undefined,
        },
      });

      await tx.historiaClinica.create({
        data: { internacionId: internacion.id },
      });

      if (data.camaId) {
        await tx.cama.update({
          where: { id: data.camaId },
          data: { estado: "OCUPADA" },
        });
      }

      return { paciente, internacion };
    });

    const internacion = await prisma.internacion.findUnique({
      where: { id: result.internacion.id },
      include: {
        paciente: true,
        cama: { include: { sector: true } },
        obraSocial: true,
      },
    });

    return NextResponse.json(internacion, { status: 201 });
  } catch (e: any) {
    if (e.message === "CAMA_NOT_FOUND") {
      return NextResponse.json({ error: "Cama no encontrada" }, { status: 404 });
    }
    if (e.message?.startsWith("CAMA_NOT_AVAILABLE")) {
      const estado = e.message.split(":")[1];
      return NextResponse.json({ error: `La cama no está disponible (estado: ${estado})` }, { status: 409 });
    }
    return NextResponse.json({ error: e.message || "Error interno" }, { status: 500 });
  }
}
