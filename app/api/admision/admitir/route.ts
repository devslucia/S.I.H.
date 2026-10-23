import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { formatZodError } from "@/lib/validations/format-zod-error";
import { errorMessage, prismaErrorCode } from "@/lib/errors";
import { blankToNull } from "@/lib/validations/sanitize";
import { assertObraSocialUsable } from "@/lib/obra-social";
import { registrarEpisodioGuardiaDesdeAdmision } from "@/lib/guardia";
import { validarCuil, fechaNacSchema, formatCuil } from "@/lib/validations/cuil";

const admitirSchema = z.object({
  dni: z.string({ required_error: "El DNI es obligatorio", invalid_type_error: "El DNI es obligatorio" })
    .transform((v) => v.replace(/[.\s]/g, ""))
    .pipe(z.string().min(7, "El DNI debe tener al menos 7 caracteres").max(11, "El DNI no puede superar 11 caracteres")),
  apellido: z.string({ required_error: "El apellido es obligatorio", invalid_type_error: "El apellido es obligatorio" }).trim().min(1, "El apellido es obligatorio"),
  nombre: z.string({ required_error: "El nombre es obligatorio", invalid_type_error: "El nombre es obligatorio" }).trim().min(1, "El nombre es obligatorio"),
  sexo: z.enum(["MASCULINO", "FEMENINO", "OTRO"], { errorMap: () => ({ message: "Seleccioná el sexo" }) }),
  fechaNac: fechaNacSchema,
  cuil: z.string().optional().nullable().refine(
    (val) => !val || !val.trim() || validarCuil(val).valido,
    { message: "CUIL inválido (formato o dígito verificador incorrecto)" }
  ),
  domicilio: z.string().optional().nullable(),
  localidad: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  estadoCivil: z.enum(["SOLTERO", "CASADO", "DIVORCIADO", "VIUDO", "UNION_CONVIVENCIAL"]).optional().nullable(),
  obraSocialId: z.string().uuid("Obra social inválida").optional().nullable(),
  nroAfiliado: z.string().optional().nullable(),
  tipoBeneficiario: z.enum(["TITULAR", "FAMILIAR"]).optional().nullable(),
  camaId: z.string().uuid("Cama inválida").optional().nullable(),
  medicoTratanteIds: z.array(z.string().uuid()).optional().nullable(),
  tipoIngreso: z.enum(["PROGRAMADO", "URGENCIA", "GUARDIA", "DERIVACION"], { errorMap: () => ({ message: "Seleccioná el tipo de ingreso" }) }),
  tipoAtencion: z.enum(["CIRUGIA_AMBULATORIA", "INTERNACION_QUIRURGICA", "INTERNACION_CLINICA"]).optional().nullable(),
  motivoIngreso: z.string().optional().nullable(),
  peso: z.number().positive("El peso debe ser mayor a 0").optional().nullable(),
  diagnosticoCirugia: z.string().optional().nullable(),
  diagnosticoCIE: z.string().optional().nullable(),
  medicoSolicitante: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "ADMISION");
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }
  const parsed = admitirSchema.safeParse(blankToNull(body));
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const data = parsed.data;

  if (data.obraSocialId) {
    const { error: osError } = await assertObraSocialUsable(prisma, data.obraSocialId, "INTERNACION");
    if (osError) return NextResponse.json({ error: osError }, { status: 400 });
  }

  const existe = await prisma.paciente.findUnique({ where: { dni: data.dni } });
  if (existe) {
    return NextResponse.json(
      { error: "Ya existe un paciente con ese DNI. Buscalo en el padrón y creá la internación desde su ficha." },
      { status: 409 }
    );
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
          cuil: data.cuil ? formatCuil(data.cuil) : null,
          domicilio: data.domicilio,
          localidad: data.localidad,
          provincia: data.provincia,
          telefono: data.telefono,
          estadoCivil: data.estadoCivil,
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
          peso: data.peso,
          diagnosticoCirugia: data.diagnosticoCirugia,
          diagnosticoCIE: data.diagnosticoCIE,
          medicoSolicitante: data.medicoSolicitante,
          tipoAtencion: data.tipoAtencion,
          medicosTratantesInternacion: data.medicoTratanteIds?.length
            ? { create: data.medicoTratanteIds.map((id) => ({ medicoId: id })) }
            : undefined,
        },
      });

      await tx.historiaClinica.create({
        data: { internacionId: internacion.id },
      });

      // HC nueva por paciente (para soporte de Episodios)
      let hcNueva = await tx.historiaClinica.findFirst({
        where: { pacienteId: paciente.id, internacionId: null },
      });
      if (!hcNueva) {
        hcNueva = await tx.historiaClinica.create({
          data: { pacienteId: paciente.id, internacionId: null },
        });
      }

      // Episodio para esta internación
      await tx.episodio.create({
        data: {
          hcId: hcNueva.id,
          tipo: "INTERNACION",
          internacionId: internacion.id,
          motivoIngreso: internacion.motivoIngreso,
          diagnostico: internacion.diagnosticoCirugia,
          estado: "EN_CURSO",
          fechaInicio: internacion.fechaIngreso,
        },
      });

      // Ingreso por guardia desde admisión: además de la internación, el paciente
      // entra a la cola de /guardia (sin duplicar si ya tiene episodio GUARDIA hoy)
      if (data.tipoIngreso === "GUARDIA") {
        await registrarEpisodioGuardiaDesdeAdmision(tx, {
          hcId: hcNueva.id,
          motivoIngreso: internacion.motivoIngreso,
          fechaInicio: internacion.fechaIngreso,
          obraSocialId: data.obraSocialId ?? null,
          usuarioIngresoId: session.user.id,
        });
      }

      if (data.camaId) {
        // Ocupación atómica: solo si la cama sigue LIBRE (evita doble asignación concurrente)
        const ocupada = await tx.cama.updateMany({
          where: { id: data.camaId, estado: "LIBRE" },
          data: { estado: "OCUPADA" },
        });
        if (ocupada.count === 0) throw new Error("CAMA_NOT_AVAILABLE:OCUPADA");
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
  } catch (e: unknown) {
    if (errorMessage(e) === "CAMA_NOT_FOUND") {
      return NextResponse.json({ error: "Cama no encontrada" }, { status: 404 });
    }
    const msg = errorMessage(e);
    if (msg?.startsWith("CAMA_NOT_AVAILABLE")) {
      const estado = msg.split(":")[1] as string;
      return NextResponse.json({ error: `La cama no está disponible (estado: ${estado})` }, { status: 409 });
    }
    if (prismaErrorCode(e) === "P2002") {
      return NextResponse.json({ error: "Ya existe un paciente con ese DNI" }, { status: 409 });
    }
    if (prismaErrorCode(e) === "P2003") {
      return NextResponse.json({ error: "Algún médico tratante u obra social seleccionado no existe" }, { status: 400 });
    }
    console.error("Error interno en POST /api/admision/admitir:", e);
    return NextResponse.json({ error: "Error interno al admitir el paciente. Reintentá." }, { status: 500 });
  }
}
