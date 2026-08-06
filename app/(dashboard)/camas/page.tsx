"use client";

import { useState, useEffect } from "react";
import { Bed, Check, Loader, User, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "next-auth/react";
import { formatUserName } from "@/lib/utils";

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  edad?: number | null;
  sexo?: string | null;
}

interface Internacion {
  id: string;
  estado: string;
  fechaIngreso: string;
  paciente: Paciente;
}

interface Cama {
  id: string;
  numero: string;
  tipo: string;
  estado: "LIBRE" | "OCUPADA" | "EN_LIMPIEZA" | "FUERA_DE_SERVICIO";
  sector: { id: string; nombre: string; codigo: string };
  internaciones?: Internacion[];
}

const estadoConfig: Record<string, { color: string; bg: string; label: string }> = {
  LIBRE: { color: "text-success", bg: "bg-success/10 border-success/30", label: "Libre" },
  OCUPADA: { color: "text-info", bg: "bg-info/10 border-info/30", label: "Ocupada" },
  EN_LIMPIEZA: { color: "text-warning", bg: "bg-warning/10 border-warning/30", label: "En Limpieza" },
  FUERA_DE_SERVICIO: { color: "text-muted", bg: "bg-muted/10 border-muted/30", label: "Fuera de Servicio" },
};

const ESTADOS_DISPONIBLES = ["LIBRE", "EN_LIMPIEZA", "FUERA_DE_SERVICIO"] as const;
const INTERNACION_ACTIVA = ["ACTIVA", "EN_QUIROFANO", "POSTQUIRURGICO"];
const ROLES_GESTION = ["ADMISION", "ADMIN"];

const btnClass = "px-3 py-2 text-xs rounded-lg font-medium transition-colors inline-flex items-center gap-1.5";
const btnConfirm = `${btnClass} bg-accent text-black hover:bg-accent/90`;
const btnCancel = `${btnClass} border border-border text-muted hover:text-foreground hover:border-muted`;


export default function CamasPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [camas, setCamas] = useState<Cama[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selected, setSelected] = useState<Cama | null>(null);
  const [confirmEstado, setConfirmEstado] = useState<string | null>(null);

  const rol = (session?.user?.rol ?? "") as string;
  const puedeGestionar = ROLES_GESTION.includes(rol);

  const fetchCamas = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/camas");
      if (res.ok) { const d = await res.json(); setCamas(Array.isArray(d) ? d : []); }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCamas(); }, []);

  const handleChangeEstado = async (cama: Cama, nuevoEstado: string) => {
    setUpdating(true);
    try {
      const res = await fetch("/api/camas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cama.id, estado: nuevoEstado }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCamas((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
        setSelected((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
        setConfirmEstado(null);
        toast("success", `Cama ${cama.numero} → ${estadoConfig[nuevoEstado].label}`);
      } else {
        const err = await res.json();
        toast("error", err.error || "Error al cambiar el estado");
        if (res.status === 409) setConfirmEstado(null);
      }
    } catch {
      toast("error", "Error de conexión");
    } finally {
      setUpdating(false);
    }
  };

  const internacion = selected?.internaciones?.[0];
  const internacionActiva = internacion && INTERNACION_ACTIVA.includes(internacion.estado);

  const grouped = camas.reduce<Record<string, Cama[]>>((acc, c) => {
    const key = c.sector.nombre;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  if (loading) return <p className="text-muted text-sm">Cargando camas...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-text">Gestión de Camas</h2>
        <div className="flex items-center gap-3 text-xs text-muted overflow-x-auto pb-1">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-success" /> Libre</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-info" /> Ocupada</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-warning" /> En Limpieza</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-muted" /> Fuera de Servicio</span>
        </div>
      </div>

      {Object.entries(grouped).map(([sector, sectorCamas]) => (
        <div key={sector}>
          <h3 className="text-sm font-medium text-text-secondary mb-2 uppercase tracking-wide">{sector}</h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {sectorCamas.map((cama) => {
              const cfg = estadoConfig[cama.estado];
              return (
                <button
                  key={cama.id}
                  onClick={() => { setSelected(cama); setConfirmEstado(null); }}
                  className={`card p-3 flex flex-col items-center gap-1 cursor-pointer hover:brightness-110 transition-all border ${cfg.bg}`}
                >
                  <Bed size={16} className={cfg.color} />
                  <span className="text-text text-xs md:text-sm font-medium">{cama.numero}</span>
                  <span className={`text-[10px] md:text-xs ${cfg.color}`}>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <Modal open={!!selected} onClose={() => { setSelected(null); setConfirmEstado(null); }} title={selected ? `Cama ${selected.numero}` : ""}>
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="default">{selected.sector.nombre}</Badge>
              <Badge variant="default">{selected.tipo}</Badge>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${estadoConfig[selected.estado].bg}`}>
                {estadoConfig[selected.estado].label}
              </span>
            </div>

            {internacion ? (
              <div className="rounded-xl border border-border bg-background/50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-text">
                  <User size={14} className="text-muted" /> {formatUserName(internacion.paciente)}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted">
                  <span>DNI: <span className="text-text">{internacion.paciente.dni}</span></span>
                  <span>Internación: <span className="text-text">{internacion.estado}</span></span>
                  <span>Ingreso: <span className="text-text">{new Date(internacion.fechaIngreso).toLocaleDateString("es-AR")}</span></span>
                  {internacion.paciente.edad != null && (
                    <span>Edad: <span className="text-text">{internacion.paciente.edad} años</span></span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted">Sin internación asociada.</p>
            )}

            {internacionActiva ? (
              <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>Esta cama tiene una internación activa, no se puede cambiar el estado directamente.</span>
              </div>
            ) : puedeGestionar ? (
              <div className="space-y-3">
                <p className="text-xs text-muted">Cambiar estado de la cama:</p>
                <div className="flex flex-wrap gap-2">
                  {ESTADOS_DISPONIBLES.filter((e) => e !== selected.estado).map((e) => (
                    <button key={e} onClick={() => setConfirmEstado(confirmEstado === e ? null : e)}
                      className={`${btnClass} border border-border text-muted hover:text-foreground hover:border-muted ${confirmEstado === e ? "border-accent text-accent" : ""}`}>
                      {estadoConfig[e].label}
                    </button>
                  ))}
                </div>
                {confirmEstado && (
                  <div className="rounded-lg border border-border bg-background/50 p-3 space-y-3">
                    <p className="text-xs text-text">
                      ¿Confirmar el cambio de <span className="text-accent">cama {selected.numero}</span> a{" "}
                      <span className="font-medium">{estadoConfig[confirmEstado].label}</span>?
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => handleChangeEstado(selected, confirmEstado)} disabled={updating}
                        className={`${btnConfirm} ${updating ? "opacity-50 cursor-not-allowed" : ""}`}>
                        {updating ? <Loader size={12} className="animate-spin" /> : <Check size={12} />} Confirmar
                      </button>
                      <button onClick={() => setConfirmEstado(null)} disabled={updating} className={btnCancel}>Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted">No tenés permisos para cambiar el estado de las camas.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
