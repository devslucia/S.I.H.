import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

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

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAuthPage = pathname.startsWith("/login");
  const isApiAuth = pathname.startsWith("/api/auth");

  if (isApiAuth) return NextResponse.next();
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && pathname.startsWith("/api/") && !isApiAuth) {
    const rol = (req.auth?.user as any)?.rol;
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

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
