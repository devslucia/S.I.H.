import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseFechaSoloDia } from "./validations/cuil";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? parseFechaSoloDia(value.slice(0, 10)) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  if (typeof value === "string" && !value.includes("T")) {
    return formatDate(value);
  }
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} · ${hh}:${min}`;
}

export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function toMoney(value: unknown, digits = 2): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(digits);
}

export function formatUserName(user: { nombre: string; apellido?: string | null }): string {
  const nombre = capitalize(user.nombre);
  const apellido = user.apellido ? capitalize(user.apellido) : "";
  if (!apellido) return nombre;
  return `${apellido}, ${nombre}`;
}
