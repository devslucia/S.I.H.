import { requireRole } from "@/lib/rbac";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { importarAlfabeta } from "@/lib/farmacia-import";

export async function POST(req: NextRequest) {
  const { error } = await requireRole("ADMIN", "FARMACIA");
  if (error) return error;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Se esperaba multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido (campo 'file')" }, { status: 400 });
  }
  const nombre = file.name.toLowerCase();
  if (!nombre.endsWith(".xls") && !nombre.endsWith(".xlsx")) {
    return NextResponse.json({ error: "Formato inválido: se esperaba .xls o .xlsx" }, { status: 400 });
  }

  let rows: Record<string, unknown>[];
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo Excel" }, { status: 400 });
  }

  const resultado = await importarAlfabeta(rows);
  return NextResponse.json(resultado);
}
