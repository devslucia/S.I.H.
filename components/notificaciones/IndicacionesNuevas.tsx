"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  link?: string | null;
  leida: boolean;
  createdAt: string;
}

const POLL_MS = 20000;

export default function IndicacionesNuevas() {
  const { status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<Notificacion[]>([]);

  const fetchIndicaciones = async () => {
    try {
      const res = await fetch("/api/notificaciones?noLeidas=1");
      if (res.ok) {
        const d = await res.json();
        setItems(Array.isArray(d) ? d : []);
      }
    } catch {
      // silencioso
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchIndicaciones();
    const interval = setInterval(fetchIndicaciones, POLL_MS);
    return () => clearInterval(interval);
  }, [status]);

  const marcarLeida = async (n: Notificacion) => {
    setItems((prev) => prev.filter((i) => i.id !== n.id));
    fetch(`/api/notificaciones/${n.id}/leer`, { method: "PATCH" }).catch(() => {});
    if (n.link) router.push(n.link);
  };

  return (
    <div className="border border-border rounded-lg bg-surface">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <BellRing size={14} className="text-brand" />
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted">Indicaciones nuevas</h2>
        {items.length > 0 && (
          <span className="ml-auto text-[11px] font-mono text-brand">{items.length} sin leer</span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-[13px] text-muted px-4 py-5">Sin indicaciones nuevas. Todo al día.</p>
      ) : (
        <div className="divide-y divide-border">
          {items.slice(0, 8).map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => marcarLeida(n)}
              className="w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                <span className="text-[13px] font-medium text-text">{n.titulo}</span>
                <span className="ml-auto text-[10px] font-mono text-muted shrink-0">
                  {formatDateTime(n.createdAt)}
                </span>
              </div>
              <p className="text-[12px] text-muted mt-0.5 leading-snug">{n.mensaje}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}