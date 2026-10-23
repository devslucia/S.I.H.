"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, BedDouble } from "lucide-react";
import { EstadoBadge } from "@/components/ui/EstadoBadge";

interface InternacionResumen {
  numero?: number;
  estado?: string;
  paciente?: {
    nombre: string;
    apellido: string;
    dni: string;
    fechaNac?: string | null;
    alergias?: { id: string; sustancia: string }[];
  };
  cama?: { numero: string; sector?: { nombre: string } | null } | null;
}

interface HcSubpageHeaderProps {
  internacionId: string;
  title: string;
  description?: React.ReactNode;
  /** Acción primaria de la pantalla (ej. "Nueva nota") */
  actions?: React.ReactNode;
}

function edad(fechaNac?: string | null): string | null {
  if (!fechaNac) return null;
  const nac = new Date(fechaNac);
  if (isNaN(nac.getTime())) return null;
  const hoy = new Date();
  let e = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
  return `${e} años`;
}

/**
 * Encabezado de las subpantallas de la HC (evolución, prescripciones, anamnesis…):
 * volver a la HC + título + banda del paciente (nombre, DNI, cama, estado y alergias)
 * para que siempre quede claro sobre qué paciente se está registrando.
 */
export function HcSubpageHeader({ internacionId, title, description, actions }: HcSubpageHeaderProps) {
  const [data, setData] = useState<InternacionResumen | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/internaciones/${internacionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => vivo && setData(d))
      .catch(() => vivo && setData(null))
      .finally(() => vivo && setLoading(false));
    return () => {
      vivo = false;
    };
  }, [internacionId]);

  const p = data?.paciente;
  const alergias = p?.alergias ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/historia-clinica/${internacionId}`}
            className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-text transition-colors mb-1"
          >
            <ArrowLeft size={13} aria-hidden /> Volver a la historia clínica
          </Link>
          <h1 className="text-lg font-semibold text-text tracking-tight leading-tight">{title}</h1>
          {description && <p className="text-[13px] text-muted mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {loading ? (
        <div className="skeleton h-[52px]" aria-hidden />
      ) : p ? (
        <div className="card flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-brand-soft text-brand flex items-center justify-center text-[12px] font-semibold shrink-0" aria-hidden>
              {`${p.nombre?.[0] ?? ""}${p.apellido?.[0] ?? ""}`.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-text truncate">
                {p.apellido}, {p.nombre}
              </div>
              <div className="text-[12px] text-muted font-mono">
                DNI {p.dni}
                {edad(p.fechaNac) && ` · ${edad(p.fechaNac)}`}
                {data?.numero != null && ` · Int. #${data.numero}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-text-secondary">
            <BedDouble size={14} className="text-muted" aria-hidden />
            {data?.cama ? `Cama ${data.cama.numero}${data.cama.sector ? ` · ${data.cama.sector.nombre}` : ""}` : "Sin cama"}
          </div>
          {data?.estado && <EstadoBadge dominio="internacion" estado={data.estado} />}
          {alergias.length > 0 ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-md border border-error/30 bg-error/10 px-2 py-0.5 text-[12px] font-medium text-error"
              title={alergias.map((a) => a.sustancia).join(", ")}
            >
              <AlertTriangle size={13} aria-hidden />
              Alergias: {alergias.map((a) => a.sustancia).join(", ")}
            </span>
          ) : (
            <span className="text-[12px] text-muted">Sin alergias registradas</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
