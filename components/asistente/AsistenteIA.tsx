"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, MessageCircleQuestion, RotateCcw, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { useToast } from "@/components/ui/Toast";
import { apiErrorMessage } from "@/lib/api-errors";
import { moduloLabel, moduloDeRuta, SUGERENCIAS_POR_MODULO } from "@/lib/asistente/conocimiento";
import type { BorradorMejora, RespuestaAsistente } from "@/lib/asistente/motor";

type Estado = "listo" | "pensando" | "respondiendo" | "error";

interface Mensaje {
  id: string;
  rol: "usuario" | "asistente";
  texto: string;
  /** Mejora detectada pendiente de confirmación */
  mejora?: BorradorMejora;
  mejoraEstado?: "pendiente" | "guardando" | "guardada" | "descartada";
  error?: boolean;
}

const SI = /^(si|sí|dale|ok|okay|registrala|registrar|guardala|de una|por favor|si,? por favor)\b/i;
const NO = /^(no|nop|no gracias|dejalo|cancelar)\b/i;

const nuevoId = () => Math.random().toString(36).slice(2);

// ───────────────────────── Render de markdown mínimo ─────────────────────────

function Inline({ texto, onNavigate }: { texto: string; onNavigate: () => void }) {
  const partes = texto.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {partes.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-semibold text-text">{p.slice(2, -2)}</strong>;
        if (p.startsWith("`") && p.endsWith("`")) {
          const code = p.slice(1, -1);
          // Rutas navegables (sin parámetros dinámicos como [id])
          if (/^\/[a-z0-9\-/]*$/i.test(code)) {
            return (
              <Link
                key={i}
                href={code}
                onClick={onNavigate}
                className="font-mono text-[12px] px-1 py-px rounded bg-brand-soft text-brand hover:underline"
              >
                {code}
              </Link>
            );
          }
          return <code key={i} className="font-mono text-[12px] px-1 py-px rounded bg-surface-hover">{code}</code>;
        }
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </>
  );
}

type BloqueMd =
  | { tipo: "p"; texto: string }
  | { tipo: "ul" | "ol"; items: { texto: string; sub: boolean }[] };

function parsearMarkdown(texto: string): BloqueMd[] {
  const bloques: BloqueMd[] = [];
  for (const linea of texto.split("\n")) {
    const m = linea.match(/^(\s*)(?:([-•])|\d+[.)]) (.*)$/);
    if (m) {
      const sub = m[1].length >= 2;
      const ultimo = bloques[bloques.length - 1];
      const tipo = m[2] ? "ul" : "ol";
      // Los sub-ítems se agregan a la lista abierta, sea del tipo que sea
      if (ultimo && ultimo.tipo !== "p" && (sub || ultimo.tipo === tipo)) {
        ultimo.items.push({ texto: m[3], sub });
      } else {
        bloques.push({ tipo, items: [{ texto: m[3], sub: false }] });
      }
    } else if (linea.trim()) {
      bloques.push({ tipo: "p", texto: linea });
    }
  }
  return bloques;
}

function Markdown({ texto, onNavigate }: { texto: string; onNavigate: () => void }) {
  return (
    <div className="space-y-2">
      {parsearMarkdown(texto).map((b, i) => {
        if (b.tipo === "p") {
          return (
            <p key={i}>
              <Inline texto={b.texto} onNavigate={onNavigate} />
            </p>
          );
        }
        const Tag = b.tipo;
        return (
          <Tag key={i} className={cn("space-y-1 pl-5", b.tipo === "ol" ? "list-decimal" : "list-disc")}>
            {b.items.map((it, j) => (
              <li key={j} className={cn(it.sub && "ml-4 list-[circle]")}>
                <Inline texto={it.texto} onNavigate={onNavigate} />
              </li>
            ))}
          </Tag>
        );
      })}
    </div>
  );
}

// ───────────────────────── Componente ─────────────────────────

/**
 * Asistente de uso del SIH: botón flotante + panel de chat.
 * Solo ayuda con el software (nunca consejos clínicos) y captura sugerencias de mejora.
 */
export function AsistenteIA() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const toast = useToast();
  const prefersReduced = usePrefersReducedMotion();

  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState("");
  const [estado, setEstado] = useState<Estado>("listo");
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [ultimaConsulta, setUltimaConsulta] = useState<string | null>(null);

  const botonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const revelarRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const rol = (session?.user as { rol?: string } | undefined)?.rol;
  const ocupado = estado === "pensando" || estado === "respondiendo";
  const mejoraPendiente = [...mensajes].reverse().find((m) => m.mejoraEstado === "pendiente");

  // Sugerencias iniciales según la pantalla
  useEffect(() => {
    if (mensajes.length === 0) {
      setSugerencias(SUGERENCIAS_POR_MODULO[moduloDeRuta(pathname) ?? "general"] ?? SUGERENCIAS_POR_MODULO.general);
    }
  }, [pathname, mensajes.length]);

  useEffect(() => {
    if (abierto) inputRef.current?.focus();
  }, [abierto]);

  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: prefersReduced ? "auto" : "smooth" });
  }, [mensajes, estado, prefersReduced]);

  useEffect(() => () => {
    if (revelarRef.current) clearInterval(revelarRef.current);
  }, []);

  const cerrar = useCallback(() => {
    setAbierto(false);
    botonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto, cerrar]);

  /** Muestra la respuesta de a poco ("respondiendo") salvo con movimiento reducido. */
  const revelar = useCallback(
    (msg: Mensaje) => {
      if (prefersReduced || msg.texto.length < 40) {
        setMensajes((prev) => [...prev, msg]);
        setEstado("listo");
        return;
      }
      setEstado("respondiendo");
      setMensajes((prev) => [...prev, { ...msg, texto: "" }]);
      const paso = Math.max(4, Math.ceil(msg.texto.length / 40));
      let n = 0;
      revelarRef.current = setInterval(() => {
        n = Math.min(msg.texto.length, n + paso);
        setMensajes((prev) => prev.map((m) => (m.id === msg.id ? { ...m, texto: msg.texto.slice(0, n) } : m)));
        if (n >= msg.texto.length) {
          if (revelarRef.current) clearInterval(revelarRef.current);
          revelarRef.current = null;
          setEstado("listo");
        }
      }, 16);
    },
    [prefersReduced]
  );

  const actualizarMejora = (id: string, mejoraEstado: Mensaje["mejoraEstado"]) =>
    setMensajes((prev) => prev.map((m) => (m.id === id ? { ...m, mejoraEstado } : m)));

  const registrarMejora = async (msg: Mensaje) => {
    if (!msg.mejora) return;
    actualizarMejora(msg.id, "guardando");
    try {
      const res = await fetch("/api/asistente/mejoras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: msg.mejora.titulo,
          descripcion: msg.mejora.descripcion,
          modulo: msg.mejora.modulo,
          ruta: msg.mejora.ruta,
          prioridad: msg.mejora.prioridad,
        }),
      });
      if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudo registrar la mejora"));
      actualizarMejora(msg.id, "guardada");
      toast.success("Mejora registrada. ¡Gracias por la sugerencia!");
      setMensajes((prev) => [
        ...prev,
        { id: nuevoId(), rol: "asistente", texto: "Listo, la registré. El equipo la va a revisar. ¿Te ayudo con algo más?" },
      ]);
    } catch (e) {
      actualizarMejora(msg.id, "pendiente");
      toast.error(e instanceof Error ? e.message : "No se pudo registrar la mejora");
    }
  };

  const descartarMejora = (msg: Mensaje) => {
    actualizarMejora(msg.id, "descartada");
    setMensajes((prev) => [...prev, { id: nuevoId(), rol: "asistente", texto: "De acuerdo, no la registro. ¿Te ayudo con algo más?" }]);
  };

  const enviar = async (texto: string, reintento = false) => {
    const consulta = texto.trim();
    if (!consulta || ocupado) return;

    // Respuesta corta a la pregunta "¿Querés que registre esta mejora?"
    if (mejoraPendiente && !reintento) {
      if (SI.test(consulta) || NO.test(consulta)) {
        setInput("");
        setMensajes((prev) => [...prev, { id: nuevoId(), rol: "usuario", texto: consulta }]);
        if (SI.test(consulta)) await registrarMejora(mejoraPendiente);
        else descartarMejora(mejoraPendiente);
        return;
      }
    }

    const historial = mensajes
      .filter((m) => !m.error && m.texto)
      .slice(-6)
      .map((m) => ({ rol: m.rol, texto: m.texto.slice(0, 2000) }));

    setInput("");
    setSugerencias([]);
    setUltimaConsulta(consulta);
    setMensajes((prev) => [
      ...prev.filter((m) => !m.error),
      ...(reintento ? [] : [{ id: nuevoId(), rol: "usuario" as const, texto: consulta }]),
    ]);
    setEstado("pensando");

    try {
      const res = await fetch("/api/asistente/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: consulta, ruta: pathname, rol, historial }),
      });
      if (!res.ok) throw new Error(await apiErrorMessage(res, "No pude responder en este momento"));
      const data = (await res.json()) as RespuestaAsistente;
      revelar({
        id: nuevoId(),
        rol: "asistente",
        texto: data.respuesta,
        mejora: data.mejoraDetectada ? data.borradorMejora : undefined,
        mejoraEstado: data.mejoraDetectada && data.borradorMejora ? "pendiente" : undefined,
      });
      setSugerencias(data.sugerencias ?? []);
    } catch (e) {
      setEstado("error");
      setMensajes((prev) => [
        ...prev,
        { id: nuevoId(), rol: "asistente", texto: e instanceof Error ? e.message : "No pude responder en este momento", error: true },
      ]);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    enviar(input);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar(input);
    }
  };

  const reiniciar = () => {
    if (revelarRef.current) clearInterval(revelarRef.current);
    revelarRef.current = null;
    setMensajes([]);
    setEstado("listo");
    setInput("");
    inputRef.current?.focus();
  };

  if (!session) return null;

  return (
    <div className="no-print">
      <AnimatePresence>
        {abierto && (
          <motion.section
            role="dialog"
            aria-label="Asistente de uso del SIH"
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", bounce: 0, duration: prefersReduced ? 0.1 : 0.3 }}
            className="fixed z-[90] bottom-20 right-4 left-4 sm:left-auto sm:w-[400px] h-[min(580px,calc(100dvh-7rem))] flex flex-col rounded-lg border border-border bg-surface shadow-lg overflow-hidden"
          >
            {/* Header */}
            <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <div className="w-8 h-8 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0" aria-hidden>
                <MessageCircleQuestion size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[14px] font-semibold text-text leading-tight">Asistente SIH</h2>
                <p className="text-[11px] text-muted leading-tight">Ayuda de uso del sistema · no da consejos médicos</p>
              </div>
              {mensajes.length > 0 && (
                <button type="button" onClick={reiniciar} className="btn-ghost btn-sm p-1.5" aria-label="Nueva conversación" title="Nueva conversación">
                  <RotateCcw size={15} />
                </button>
              )}
              <button type="button" onClick={cerrar} className="btn-ghost btn-sm p-1.5" aria-label="Cerrar asistente">
                <X size={16} />
              </button>
            </header>

            {/* Mensajes */}
            <div ref={listaRef} role="log" aria-live="polite" aria-busy={ocupado} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-[13px] leading-relaxed">
              {mensajes.length === 0 && (
                <div className="text-text-secondary space-y-2">
                  <p>
                    ¡Hola{session.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}! Te ayudo a usar el SIH: dónde está cada cosa y cómo hacer cada tarea según tu rol.
                  </p>
                  <p className="text-muted text-[12px]">
                    Si algo no te resulta práctico, contámelo (por ejemplo &quot;estaría bueno que…&quot;) y lo registro como sugerencia de mejora.
                  </p>
                </div>
              )}

              {mensajes.map((m) => (
                <div key={m.id} className={cn("flex", m.rol === "usuario" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[88%] rounded-lg px-3 py-2",
                      m.rol === "usuario" && "bg-accent-button text-white whitespace-pre-wrap",
                      m.rol === "asistente" && !m.error && "bg-surface-hover text-text-secondary",
                      m.error && "alert-error"
                    )}
                  >
                    {m.rol === "usuario" ? m.texto : <Markdown texto={m.texto} onNavigate={() => setAbierto(false)} />}

                    {m.error && estado === "error" && ultimaConsulta && (
                      <button type="button" onClick={() => enviar(ultimaConsulta, true)} className="btn-secondary btn-sm mt-2">
                        <RotateCcw size={13} /> Reintentar
                      </button>
                    )}

                    {m.mejora && m.mejoraEstado && m.mejoraEstado !== "descartada" && (
                      <div className="mt-2.5 rounded-md border border-border bg-surface p-2.5 space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wide text-muted">
                          <Lightbulb size={13} className="text-warning" aria-hidden /> Sugerencia · {moduloLabel(m.mejora.modulo)}
                        </div>
                        <p className="text-[13px] text-text font-medium">{m.mejora.titulo}</p>
                        {m.mejoraEstado === "guardada" ? (
                          <p className="text-[12px] text-success font-medium">✓ Registrada</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => registrarMejora(m)}
                              disabled={m.mejoraEstado === "guardando"}
                              className="btn-primary btn-sm"
                            >
                              {m.mejoraEstado === "guardando" ? "Registrando…" : "Sí, registrar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => descartarMejora(m)}
                              disabled={m.mejoraEstado === "guardando"}
                              className="btn-ghost btn-sm"
                            >
                              No, gracias
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {estado === "pensando" && (
                <div className="flex justify-start">
                  <div className="rounded-lg px-3 py-2 bg-surface-hover text-muted text-[12px] inline-flex items-center gap-2">
                    <span className="inline-flex gap-1" aria-hidden>
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </span>
                    Pensando…
                  </div>
                </div>
              )}
            </div>

            {/* Sugerencias */}
            {sugerencias.length > 0 && !ocupado && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {sugerencias.slice(0, 3).map((s) => (
                  <button key={s} type="button" onClick={() => enviar(s)} className="chip-inactive border text-[12px] px-2.5 py-1 rounded-md transition-colors text-left">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Entrada */}
            <form onSubmit={onSubmit} className="border-t border-border px-3 pt-2.5 pb-2">
              <div className="flex items-end gap-2">
                <label htmlFor="asistente-input" className="sr-only">
                  Escribí tu consulta
                </label>
                <textarea
                  id="asistente-input"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, 1000))}
                  onKeyDown={onKeyDown}
                  rows={1}
                  placeholder={mejoraPendiente ? "Respondé sí o no, o seguí preguntando…" : "¿Cómo hago…?"}
                  className="input-field flex-1 resize-none max-h-28 min-h-[38px] py-2"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || ocupado}
                  className="btn-primary h-[38px] w-[38px] p-0 justify-center shrink-0"
                  aria-label="Enviar consulta"
                >
                  <Send size={15} />
                </button>
              </div>
              <p className="text-[11px] text-muted mt-1.5">No escribas datos de pacientes. Enter envía · Shift+Enter, nueva línea.</p>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <button
        ref={botonRef}
        type="button"
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
        aria-expanded={abierto}
        aria-label={abierto ? "Cerrar asistente" : "Abrir asistente de uso"}
        title="Asistente de uso del SIH"
        className="fixed z-[90] bottom-4 right-4 w-12 h-12 rounded-lg bg-accent-button text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {abierto ? <X size={20} /> : <MessageCircleQuestion size={22} />}
      </button>
    </div>
  );
}
