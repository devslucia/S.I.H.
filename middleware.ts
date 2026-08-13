import { auth } from "@/lib/auth-middleware";
import { NextResponse } from "next/server";

// ── Rate limit de login ──
// En memoria, por worker de edge. Protege contra fuerza bruta en una instancia;
// en deploy multi-instancia (serverless) cada worker tiene su propio contador
// (limitación documentada; no bloquea a usuarios legítimos).
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const LOGIN_MAX_IP = 60; // por IP (toda una red hospitalaria puede salir por NAT)
const LOGIN_MAX_PAR = 10; // por par IP+email (un usuario que falla la clave)

const loginIntentos = new Map<string, number[]>();

function contarEnVentana(key: string, now: number): number {
  const ts = (loginIntentos.get(key) ?? []).filter((t) => now - t < LOGIN_WINDOW_MS);
  loginIntentos.set(key, ts);
  return ts.length;
}

function registrarIntento(key: string, now: number) {
  const ts = (loginIntentos.get(key) ?? []).filter((t) => now - t < LOGIN_WINDOW_MS);
  ts.push(now);
  loginIntentos.set(key, ts);
}

export default auth(async (req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith("/api/auth")) {
    if (pathname === "/api/auth/callback/credentials" && req.method === "POST") {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "unknown";

      let email = "unknown";
      try {
        const body = await req.clone().text();
        email = new URLSearchParams(body).get("email") || "unknown";
      } catch {
        // body ilegible: se cuenta igual contra el límite por IP
      }

      const now = Date.now();
      if (contarEnVentana(`ip:${ip}`, now) >= LOGIN_MAX_IP) {
        return NextResponse.json(
          { error: "Demasiados intentos de inicio de sesión. Esperá 15 minutos." },
          { status: 429 }
        );
      }
      if (contarEnVentana(`par:${ip}:${email}`, now) >= LOGIN_MAX_PAR) {
        return NextResponse.json(
          { error: "Demasiados intentos para esta cuenta. Esperá 15 minutos." },
          { status: 429 }
        );
      }

      registrarIntento(`ip:${ip}`, now);
      registrarIntento(`par:${ip}:${email}`, now);
    }
    return NextResponse.next();
  }
  if (pathname.startsWith("/_next")) return NextResponse.next();
  if (pathname === "/favicon.ico") return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/login")) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};