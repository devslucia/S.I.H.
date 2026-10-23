/**
 * Convierte strings vacíos (o solo espacios) en null en el primer nivel de un body.
 * Los formularios envían "" para selects/inputs opcionales sin completar y los
 * schemas (uuid, enum, email) los rechazarían con un 400 confuso.
 */
export function blankToNull<T>(body: T): T {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    out[k] = typeof v === "string" && v.trim() === "" ? null : v;
  }
  return out as T;
}
