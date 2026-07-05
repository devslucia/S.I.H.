import { requireRole } from "@/lib/rbac";
import { isInternacionVisibleForUser } from "@/lib/internaciones-visibility";
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

  if (!(await isInternacionVisibleForUser(params.id, session!.user.id, session!.user.rol))) {
    return NextResponse.json({ error: "Internación no encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    message: "PDF generation endpoint",
    formulario: params.formulario,
    id: params.id,
  });
}
