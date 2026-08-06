import { prisma } from "@/lib/prisma";
import { type DiaSemana } from "@prisma/client";

const DIA_SEMANA_MAP: Record<number, string> = {
  0: "DOMINGO",
  1: "LUNES",
  2: "MARTES",
  3: "MIERCOLES",
  4: "JUEVES",
  5: "VIERNES",
  6: "SABADO",
};

function generarSlots(horaInicio: string, horaFin: string, intervaloMin: number): string[] {
  const slots: string[] = [];
  const [inicioH, inicioM] = horaInicio.split(":").map(Number);
  const [finH, finM] = horaFin.split(":").map(Number);

  let minutos = inicioH * 60 + inicioM;
  const finMinutos = finH * 60 + finM;

  while (minutos < finMinutos) {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    minutos += intervaloMin;
  }

  return slots;
}

export async function obtenerDisponibilidad(medicoId: string, fecha: Date) {
  const diaSemana = DIA_SEMANA_MAP[fecha.getDay()];

  const horarios = await prisma.horarioMedicoConsultorio.findMany({
    where: { medicoId, dia: diaSemana as DiaSemana, activo: true },
  });

  if (horarios.length === 0) return [];

  // Generar todos los slots del día
  const todosLosSlots: string[] = [];
  for (const horario of horarios) {
    todosLosSlots.push(...generarSlots(horario.horaInicio, horario.horaFin, horario.intervaloMin));
  }

  // Obtener turnos ocupados para esa fecha y médico
  const turnosOcupados = await prisma.turnoConsultorio.findMany({
    where: {
      medicoId,
      fecha,
      estado: { notIn: ["CANCELADO", "NO_ASISTIO"] },
    },
    select: { hora: true },
  });

  const horasOcupadas = new Set(turnosOcupados.map((t) => t.hora));

  return todosLosSlots.map((hora) => ({
    hora,
    disponible: !horasOcupadas.has(hora),
  }));
}
