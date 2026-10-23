/**
 * Mensaje de error legible (en español) para mostrar en toasts a partir de una
 * respuesta fallida de la API. Usa el `error` del backend si viene; si no,
 * un texto según el status. Uso en cliente:
 *
 *   if (!res.ok) toast("error", await apiErrorMessage(res, "No se pudo guardar la evolución"));
 */
export async function apiErrorMessage(res: Response, fallback: string): Promise<string> {
  let body: { error?: unknown; detalle?: unknown } | null = null;
  try {
    body = await res.clone().json();
  } catch {
    body = null;
  }

  if (body && typeof body.error === "string" && body.error.trim()) {
    const detalle = typeof body.detalle === "string" && body.detalle.trim() ? ` (${body.detalle})` : "";
    return `${body.error}${detalle}`;
  }

  switch (res.status) {
    case 401:
      return "Tu sesión expiró. Volvé a iniciar sesión.";
    case 403:
      return `${fallback}: tu rol no tiene permiso para esta acción.`;
    case 404:
      return `${fallback}: el registro no existe.`;
    case 409:
      return `${fallback}: conflicto con el estado actual del registro.`;
    case 429:
      return "Demasiados intentos. Esperá unos minutos.";
    default:
      return res.status >= 500 ? `${fallback}: error del servidor. Reintentá en unos segundos.` : fallback;
  }
}
