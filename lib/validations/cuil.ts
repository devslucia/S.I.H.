import { z } from "zod";

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

export function calcularEdad(fechaNac: Date | string): number {
  const nacimiento = new Date(fechaNac);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mesActual = hoy.getMonth();
  const diaActual = hoy.getDate();
  if (mesActual < nacimiento.getMonth() || (mesActual === nacimiento.getMonth() && diaActual < nacimiento.getDate())) {
    edad--;
  }
  if (edad > 120) return 120; // cap máximo razonable
  return edad;
}

export const fechaNacSchema = z.string().transform((v) => new Date(v)).refine(
  (date) => {
    const hoy = new Date();
    const nacimiento = new Date(date);
    if (nacimiento > hoy) return false;
    const edad = new Date().getFullYear() - nacimiento.getFullYear();
    const mesActual = new Date().getMonth();
    const diaActual = new Date().getDate();
    if (mesActual < nacimiento.getMonth() || (mesActual === nacimiento.getMonth() && diaActual < nacimiento.getDate())) {
      return edad - 1 >= 0 && edad - 1 <= 120;
    }
    return edad >= 0 && edad <= 120;
  },
  { message: "Fecha de nacimiento inválida (edad debe ser entre 0 y 120 años)" }
);