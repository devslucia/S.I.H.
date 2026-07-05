import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

interface AuthSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    rol: string;
    matricula?: string | null;
  };
}

export async function requireRole(
  ...allowedRoles: string[]
): Promise<{ session: AuthSession; error?: never } | { session?: never; error: NextResponse }> {
  const rawSession = await auth();
  if (!rawSession) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }

  const session = rawSession as AuthSession;
  const rol = session.user.rol;

  if (!allowedRoles.includes(rol)) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
  }

  return { session };
}
