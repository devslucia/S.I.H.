import { z } from "zod";

export function parseFechaSoloDia(isoDate: string): Date {
  const [yy, mm, dd] = isoDate.slice(0, 10).split("-").map(Number);
  return new Date(yy, mm - 1, dd, 12, 0, 0, 0);
}

export function normalizeCuil(cuil: string): string {
  return cuil.replace(/[-\s]/g, "");
}

export function formatCuil(cuil: string): string {
  const normalized = normalizeCuil(cuil);
  if (normalized.length !== 11) return cuil;
  return `${normalized.slice(0, 2)}-${normalized.slice(2, 10)}-${normalized.slice(10)}`;
}

function calcularDigitoVerificador(cuil: string): number {
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  for (let i = 0; i < 10; i++) {
    suma += Number(cuil[i]) * pesos[i];
  }
  const resto = suma % 11;
  if (resto === 0) return 0;
  if (resto === 1) return 9;
  return 11 - resto;
}

export function validarCuil(cuil: string): { valido: boolean; normalizado: string; error?: string } {
  const normalizado = normalizeCuil(cuil);

  if (!/^\d{11}$/.test(normalizado)) {
    return { valido: false, normalizado, error: "El CUIL debe tener 11 dígitos numéricos" };
  }

  const digitoVerificador = calcularDigitoVerificador(normalizado);
  const digitoIngresado = Number(normalizado[10]);

  if (digitoVerificador !== digitoIngresado) {
    return { valido: false, normalizado, error: "Dígito verificador del CUIL inválido" };
  }

  return { valido: true, normalizado };
}

export function calcularEdad(fechaNac: Date | string, hoy = new Date()): number {
  const nac = typeof fechaNac === "string" ? parseFechaSoloDia(fechaNac) : fechaNac;
  const y = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  const d = hoy.getDate() - nac.getDate();
  let edad = y;
  if (m < 0 || (m === 0 && d < 0)) edad--;
  return Math.max(0, Math.min(edad, 120));
}

export const fechaNacSchema = z.string().transform((v) => parseFechaSoloDia(v)).refine(
  (nacimiento) => {
    const hoy = new Date();
    if (nacimiento > hoy) return false;
    const edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    const d = hoy.getDate() - nacimiento.getDate();
    const edadReal = (m < 0 || (m === 0 && d < 0)) ? edad - 1 : edad;
    return edadReal >= 0 && edadReal <= 120;
  },
  { message: "Fecha de nacimiento inválida (edad debe ser entre 0 y 120 años)" }
);