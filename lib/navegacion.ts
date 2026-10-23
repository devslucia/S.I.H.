/**
 * Roles que ven cada módulo en la navegación. Es la misma tabla que usa el Sidebar;
 * sirve para no ofrecer links (KPIs, accesos rápidos) a pantallas que el rol no puede abrir.
 * No reemplaza el control de permisos del servidor.
 */
const CLINICOS = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];
const TODOS = [...CLINICOS, "ADMISION", "FACTURACION", "FARMACIA", "SECRETARIA"];

export const ROLES_POR_MODULO: Record<string, string[]> = {
  "/": TODOS,
  "/admision": ["ADMIN", "ADMISION"],
  "/guardia": ["ADMIN", "ADMISION", "MEDICO", "ENFERMERO"],
  "/camas": [...CLINICOS, "ADMISION", "FACTURACION"],
  "/consultorio": ["ADMIN", "SECRETARIA", "MEDICO"],
  "/atencion-medica": ["ADMIN", "MEDICO", "ANESTESIOLOGO"],
  "/historia-clinica": CLINICOS,
  "/enfermeria": ["ADMIN", "ENFERMERO"],
  "/quirofano": ["ADMIN", "MEDICO", "ANESTESIOLOGO", "INSTRUMENTADOR", "ENFERMERO"],
  "/plantillas": ["ADMIN", "MEDICO", "ANESTESIOLOGO"],
  "/farmacia": ["ADMIN", "FARMACIA"],
  "/facturacion": ["ADMIN", "FACTURACION"],
  "/configuracion": ["ADMIN"],
};

/** ¿El rol ve el módulo al que pertenece `href`? (por el primer segmento de la ruta) */
export function puedeVerModulo(rol: string | null | undefined, href: string): boolean {
  if (!rol) return false;
  const base = "/" + (href.split("?")[0].split("/")[1] ?? "");
  const roles = ROLES_POR_MODULO[base];
  return roles ? roles.includes(rol) : true;
}
