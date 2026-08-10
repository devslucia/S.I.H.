"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn, formatDateTime } from "@/lib/utils";

interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  link?: string | null;
  leida: boolean;
  createdAt: string;
}

const ROLES_CAMPANA = ["ENFERMERO", "ADMIN"];
const POLL_MS = 20000;

export default function CampanaNotificaciones() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const rol = session?.user?.rol;
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchAll = async () => {
    try {
      const [listaRes, countRes] = await Promise.all([
        fetch("/api/notificaciones"),
        fetch("/api/notificaciones/count"),
      ]);
      if (listaRes.ok) {
        const d = await listaRes.json();
        setItems(Array.isArray(d) ? d : []);
      }
      if (countRes.ok) {
        const d = await countRes.json();
        setNoLeidas(d.noLeidas ?? 0);
      }
    } catch {
      // silencioso: el próximo poll reintenta
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!ROLES_CAMPANA.includes(rol || "")) return;
    fetchAll();
    const interval = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(interval);
  }, [status, rol]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!ROLES_CAMPANA.includes(rol || "")) return null;

  const marcarLeida = async (n: Notificacion) => {
    if (!n.leida) {
      setNoLeidas((c) => Math.max(0, c - 1));
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, leida: true } : i)));
      fetch(`/api/notificaciones/${n.id}/leer`, { method: "PATCH" }).catch(() => {});
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-muted hover:text-text hover:bg-surface-hover transition-colors duration-150"
        aria-label="Notificaciones"
      >
        <Bell size={16} />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-error text-white text-[10px] font-medium flex items-center justify-center">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-lg shadow-card z-50 overflow-hidden"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-widest text-muted">Notificaciones</span>
              <span className="text-[11px] font-mono text-muted/70">
                {noLeidas > 0 ? `${noLeidas} sin leer` : "todo al día"}
              </span>
            </div>

            {items.length === 0 ? (
              <p className="text-[13px] text-muted py-8 text-center">Sin notificaciones.</p>
            ) : (
              <div className="max-h-96 overflow-y-auto divide-y divide-border">
                {items.slice(0, 10).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => marcarLeida(n)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 transition-colors hover:bg-surface-hover",
                      !n.leida && "bg-brand-soft/40"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {!n.leida && <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />}
                      <span className="text-[13px] font-medium text-text">{n.titulo}</span>
                      <span className="ml-auto text-[10px] font-mono text-muted shrink-0">
                        {formatDateTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted mt-0.5 leading-snug line-clamp-2">{n.mensaje}</p>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}