"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Credenciales inválidas");
      setLoading(false);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Activity className="w-10 h-10 text-accent" />
            <span className="text-3xl font-bold text-accent font-mono">S.I.H.</span>
          </div>
          <p className="text-muted text-sm">Sistema Informático Hospitalario</p>
          <p className="text-muted text-xs mt-1">Sanatorio SIMES — Posadas, Misiones</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <h2 className="text-lg font-display font-semibold text-text">Iniciar Sesión</h2>

          {error && (
            <div className="bg-error/10 border border-error/30 rounded-lg p-3 text-error text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-muted text-xs mb-1.5 uppercase tracking-wide">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@simes.com.ar"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-muted text-xs mb-1.5 uppercase tracking-wide">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>


        </form>
      </div>
    </div>
  );
}
