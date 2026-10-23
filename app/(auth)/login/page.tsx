"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Activity, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    let result: Awaited<ReturnType<typeof signIn>> | undefined;
    try {
      result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
    } catch {
      setError("No se pudo conectar con el servidor. Verificá la conexión e intentá de nuevo.");
      setLoading(false);
      return;
    }

    if (result?.status === 429) {
      setError("Demasiados intentos. Esperá 15 minutos.");
      setLoading(false);
    } else if (result?.error) {
      setError("Email o contraseña incorrectos, o usuario inactivo");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="mx-auto mb-3 w-12 h-12 rounded-xl bg-accent-button flex items-center justify-center shadow-card">
            <Activity className="w-6 h-6 text-white" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold text-text tracking-tight">S.I.H.</h1>
          <p className="text-muted text-[13px] mt-0.5">Sistema Informático Hospitalario</p>
        </div>

        <form onSubmit={handleSubmit} className="card shadow-elevated p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-text">Iniciar sesión</h2>
            <p className="text-[12px] text-muted mt-0.5">Ingresá con tu email institucional.</p>
          </div>

          {error && (
            <div className="alert-error" role="alert">
              <AlertCircle size={15} className="mt-px shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className="field-label">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@simes.com.ar"
              className="input-field"
              autoComplete="username"
              autoFocus
              required
              aria-invalid={error ? true : undefined}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-password" className="field-label">Contraseña</label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pr-10"
                autoComplete="current-password"
                required
                aria-invalid={error ? true : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-muted hover:text-text rounded-r-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
            aria-busy={loading}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" aria-hidden /> Ingresando…
              </>
            ) : (
              "Ingresar"
            )}
          </button>
        </form>

        <p className="text-center text-muted text-[11px] mt-6">Desarrollado por Cristaldo</p>
      </div>
    </div>
  );
}
