import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { formulario: string; id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  return NextResponse.json({
    message: "PDF generation endpoint",
    formulario: params.formulario,
    id: params.id,
  });
}
