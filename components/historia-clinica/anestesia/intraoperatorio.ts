// Constantes compartidas del registro intraoperatorio de anestesia (FAAAAR/AIMS).
// Los colores acá son la fuente de verdad de las series: el panel lateral, la
// grilla y la tabla usan exactamente estos valores.

export type VariableIntraop =
  | "pas"
  | "pad"
  | "pam"
  | "fc"
  | "spo2"
  | "fr"
  | "etco2"
  | "temp"
  | "oxigenoFlujo";

export const VARIABLE_LABELS: Record<VariableIntraop, string> = {
  pas: "PA Sistólica",
  pad: "PA Diastólica",
  pam: "PA Media",
  fc: "Frec. Cardíaca",
  spo2: "SpO₂",
  fr: "Frec. Respiratoria",
  etco2: "EtCO₂",
  temp: "Temp",
  oxigenoFlujo: "O₂ Flujo",
};

export const VARIABLE_COLORES: Record<VariableIntraop, string> = {
  pas: "#ef4444",
  pad: "#3b82f6",
  pam: "#a855f7",
  fc: "#f97316",
  spo2: "#22c55e",
  fr: "#06b6d4",
  etco2: "#eab308",
  temp: "#ec4899",
  oxigenoFlujo: "#8b5cf6",
};

export const VARIABLE_UNIDADES: Record<VariableIntraop, string> = {
  pas: "mmHg",
  pad: "mmHg",
  pam: "mmHg",
  fc: "lpm",
  spo2: "%",
  fr: "rpm",
  etco2: "mmHg",
  temp: "°C",
  oxigenoFlujo: "L/min",
};

export const VARIABLE_DEFAULT: Partial<Record<VariableIntraop, number>> = {
  pas: 120,
  pad: 80,
  fc: 80,
  spo2: 98,
  fr: 14,
  etco2: 35,
  temp: 36.5,
};

// Variables disponibles en el panel lateral de registro rápido
export const VARIABLES_PANEL: VariableIntraop[] = ["pas", "pad", "fc", "spo2", "etco2", "fr", "temp"];

// Eventos quirúrgicos de un toque (se marcan en la franja temporal)
export const EVENTOS_INTRAOP = [
  { key: "inicio_anestesia", label: "Inicio anestesia" },
  { key: "inicio_cirugia", label: "Inicio cirugía" },
  { key: "intubacion", label: "Intubación" },
  { key: "extubacion", label: "Extubación" },
  { key: "fin_cirugia", label: "Fin cirugía" },
  { key: "fin_anestesia", label: "Fin anestesia" },
] as const;

// Símbolos FAAAAR por evento (X / O / Ø / ] / I / E)
export const EVENTO_SIMBOLOS: Record<string, { simbolo: string; color: string }> = {
  inicio_anestesia: { simbolo: "X", color: "#64748b" },
  inicio_cirugia: { simbolo: "O", color: "#f97316" },
  intubacion: { simbolo: "I", color: "#3b82f6" },
  extubacion: { simbolo: "E", color: "#3b82f6" },
  fin_cirugia: { simbolo: "Ø", color: "#f97316" },
  fin_anestesia: { simbolo: "]", color: "#c47a5a" },
};

// ===== FASE 3: gases, fármacos y balance =====

export type GasIntraop = "sevo" | "iso" | "des";

// Anestésicos inhalatorios (escala 0-10 %)
export const GASES_INTRAOP: { key: GasIntraop; label: string; color: string; min: number; max: number }[] = [
  { key: "sevo", label: "Sevo %", color: "#14b8a6", min: 0, max: 10 },
  { key: "iso", label: "Iso %", color: "#a855f7", min: 0, max: 10 },
  { key: "des", label: "Des %", color: "#f43f5e", min: 0, max: 10 },
];

// FiO₂ (escala 21-100 %) — renglón aparte
export const GAS_FIO2 = { key: "fio2" as const, label: "FiO₂ %", color: "#38bdf8", min: 21, max: 100 };

export const DROGAS_BOLO = [
  "Propofol",
  "Etomidato",
  "Midazolam",
  "Fentanilo",
  "Morfina",
  "Ketamina",
  "Succinilcolina",
  "Rocuronio",
  "Atracurio",
  "Vecuronio",
  "Atropina",
  "Efedrina",
  "Fenilefrina",
  "Adrenalina",
  "Lidocaína",
  "Tramadol",
  "Ondansetrón",
  "Dexametasona",
] as const;

export const DROGAS_INFUSION = [
  "Propofol",
  "Remifentanilo",
  "Fentanilo",
  "Rocuronio",
  "Norepinefrina",
  "Vasopresina",
  "Insulina",
  "Tranexámico",
  "Suero fisiológico",
  "Ringer Lactato",
] as const;

export const UNIDADES_BOLO = ["mg", "mcg", "g", "ml", "UI", "mEq"] as const;

export const VELOCIDADES_INFUSION = ["5 ml/h", "10 ml/h", "20 ml/h", "50 ml/h", "100 ml/h", "250 ml/h", "500 ml/h"] as const;

export const MODALIDADES_VENT = ["ARM", "VM", "EVP", "Espontánea"] as const;

// Paleta para colorear drogas (bolos/infusiones) según hash del nombre
export const DROGA_COLORS = ["#059669", "#7c3aed", "#c026d3", "#ea580c", "#2563eb", "#0d9488", "#be185d", "#4d7c0f"];

export function colorDeDroga(droga: string): string {
  let h = 0;
  for (let i = 0; i < droga.length; i++) h = (h * 31 + droga.charCodeAt(i)) >>> 0;
  return DROGA_COLORS[h % DROGA_COLORS.length];
}

// Colores del balance de fluidos (ingresos / egresos)
export const BAL_INGRESO_COLOR = "#0d9488";
export const BAL_EGRESO_COLOR = "#e11d48";
