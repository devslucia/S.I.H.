import { ZodError } from "zod";

export function formatZodError(error: ZodError): string {
  const flat = error.flatten().fieldErrors;
  const parts = Object.entries(flat)
    .filter(([, msgs]) => msgs && msgs.length > 0)
    .map(([field, msgs]) => `${field}: ${msgs!.join(", ")}`);
  return parts.length > 0 ? parts.join("; ") : "Datos inválidos";
}
