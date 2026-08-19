export type RubroFacturacion = "KIN" | "BIO" | "GAS" | "HON" | "MED";

export const RUBROS: { id: RubroFacturacion; label: string; descripcion: string }[] = [
  { id: "KIN", label: "Kinesiología", descripcion: "Prácticas de kinesiología" },
  { id: "BIO", label: "Bioquímica / laboratorio", descripcion: "Estudios y laboratorio" },
  { id: "GAS", label: "Gastos", descripcion: "Cama, materiales, descartables" },
  { id: "HON", label: "Honorarios", descripcion: "Prácticas y actos médicos" },
  { id: "MED", label: "Medicamentos", descripcion: "Medicación administrada" },
];

const RUBRO_POR_ORIGEN: Record<string, RubroFacturacion> = {
  PRACTICA: "HON",
  QUIROFANO: "HON",
  ANESTESIA: "HON",
  GUARDIA: "HON",
  MEDICACION: "MED",
  CAMA: "GAS",
  MATERIAL: "GAS",
  DESCARTABLE: "GAS",
  ESTUDIO: "BIO",
  OTRO: "GAS",
};

export function rubroDeOrigen(origen: string): RubroFacturacion | null {
  return RUBRO_POR_ORIGEN[origen] ?? null;
}

export type EstadoLiquidacion = "PENDIENTE" | "PARCIAL" | "FACTURADO";

export function estadoDeCargos(cargos: { facturado: boolean }[]): EstadoLiquidacion {
  const total = cargos.length;
  const facturados = cargos.filter((c) => c.facturado).length;
  if (total === 0 || facturados === 0) return "PENDIENTE";
  if (facturados === total) return "FACTURADO";
  return "PARCIAL";
}