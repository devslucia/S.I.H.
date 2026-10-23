import { requireRole } from "@/lib/rbac";
import { internacionAccessError } from "@/lib/internaciones-visibility";
import { NextRequest, NextResponse } from "next/server";

const PDF_DEFAULT_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"];
const PDF_ANESTESIA_ROLES = ["ADMIN", "MEDICO", "ANESTESIOLOGO", "INSTRUMENTADOR"];
const PDF_INFORME_ADMISION_ROLES = ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "ADMISION"];

export async function GET(req: NextRequest, { params }: { params: { formulario: string; id: string } }) {
  let allowedRoles: string[];
  if (params.formulario === "protocolo-anestesia") {
    allowedRoles = PDF_ANESTESIA_ROLES;
  } else if (params.formulario === "informe-hospitalizacion") {
    allowedRoles = PDF_INFORME_ADMISION_ROLES;
  } else {
    allowedRoles = PDF_DEFAULT_ROLES;
  }

  const { session, error } = await requireRole(...allowedRoles);
  if (error) return error;

  const accesoError = await internacionAccessError(params.id, session!.user.id, session!.user.rol);
  if (accesoError) return accesoError;

  return NextResponse.json({
    message: "PDF generation endpoint",
    formulario: params.formulario,
    id: params.id,
  });
}
