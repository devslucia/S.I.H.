import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

const roleAccess: Record<string, string[]> = {
  "/api/pacientes": ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "FACTURACION", "FARMACIA"],
  "/api/internaciones": ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "FACTURACION", "FARMACIA"],
  "/api/camas": ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "FACTURACION", "FARMACIA"],
  "/api/historia-clinica": ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR"],
  "/api/quirofano": ["ADMIN", "MEDICO", "ANESTESIOLOGO", "INSTRUMENTADOR"],
  "/api/farmacia": ["ADMIN", "FARMACIA"],
  "/api/facturacion": ["ADMIN", "FACTURACION"],
  "/api/pdf": ["ADMIN", "MEDICO", "ENFERMERO", "ANESTESIOLOGO", "INSTRUMENTADOR", "FACTURACION", "FARMACIA"],
};

function getTokenFromCookies(req: NextRequest): string | null {
  const cookieName = process.env.NODE_ENV === "production"
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";
  return req.cookies.get(cookieName)?.value || null;
}

async function decodeToken(token: string): Promise<{ rol?: string } | null> {
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "");
    const { payload } = await jose.jwtVerify(token, secret);
    return payload as any;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const publicPaths = ["/login", "/api/auth"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  let tokenData: { rol?: string } | null = null;
  try {
    const raw = getTokenFromCookies(req);
    if (raw) tokenData = await decodeToken(raw);
  } catch {
    tokenData = null;
  }

  if (!tokenData && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (tokenData) {
    if (pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (pathname.startsWith("/api/")) {
      const rol = tokenData.rol as string;
      const sorted = Object.keys(roleAccess).sort((a, b) => b.length - a.length);
      for (const prefix of sorted) {
        if (pathname.startsWith(prefix)) {
          if (!roleAccess[prefix].includes(rol)) {
            return NextResponse.json({ error: "Acceso denegado para este rol" }, { status: 403 });
          }
          break;
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
