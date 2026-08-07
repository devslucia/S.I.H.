"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpsStat } from "@/components/ui/OpsStat";
import { Modal } from "@/components/ui/Modal";
import { BedMap, type BedMapCama } from "@/components/ui/BedMap";
import { CamaDetailPanel, type CamaDetailData, type CamaEstado } from "@/components/ui/CamaDetailPanel";
import { RefreshCw } from "lucide-react";

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
  estado: CamaEstado;
  sector: { id: string; nombre: string; codigo: string };
  internaciones?: Internacion[];
}

const ESTADOS_MANUALES: CamaEstado[] = ["LIBRE", "EN_LIMPIEZA", "FUERA_DE_SERVICIO"];
const INTERNACION_ACTIVA = ["ACTIVA", "EN_QUIROFANO", "POSTQUIRURGICO"];
const ROLES_GESTION = ["ADMISION", "ADMIN"];

function estadosPosibles(actual: CamaEstado): CamaEstado[] {
  return ESTADOS_MANUALES.filter((e) => e !== actual);
}

function buildCamaDetail(c: Cama, internacion: Internacion | undefined): CamaDetailData {
  const activa = internacion ? INTERNACION_ACTIVA.includes(internacion.estado) : false;
  return {
    id: c.id,
    numero: c.numero,
    tipo: c.tipo,
    estado: c.estado,
    sectorNombre: c.sector?.nombre ?? "Sin sector",
    paciente: internacion?.paciente
      ? {
          nombre: internacion.paciente.nombre,
          apellido: internacion.paciente.apellido,
          dni: internacion.paciente.dni,
          edad: internacion.paciente.edad ?? null,
          sexo: internacion.paciente.sexo ?? null,
        }
      : null,
    internacionEstado: internacion?.estado,
    internacionFechaIngreso: internacion?.fechaIngreso,
    internacionActiva: activa,
  };
}

export default function CamasPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [camas, setCamas] = useState<Cama[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Cama | null>(null);

  const rol = (session?.user?.rol ?? "") as string;
  const puedeGestionar = ROLES_GESTION.includes(rol);

  const fetchCamas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/camas");
      if (res.ok) {
        const d = await res.json();
        setCamas(Array.isArray(d) ? d : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCamas();
  }, [fetchCamas]);

  const handleChangeEstado = async (id: string, nuevoEstado: CamaEstado) => {
    try {
      const res = await fetch("/api/camas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estado: nuevoEstado }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCamas((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
        setSelected((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
        toast("success", `Cama ${updated.numero} actualizada`);
        return null;
      }
      const err = await res.json();
      toast("error", err.error || "Error al cambiar el estado");
      return err.error || "Error desconocido";
    } catch {
      toast("error", "Error de conexión");
      return "Error de conexión";
    }
  };

  const camasMap: BedMapCama[] = camas.map((c) => {
    const internacion = c.internaciones?.[0];
    return {
      id: c.id,
      numero: c.numero,
      estado: c.estado,
      sectorNombre: c.sector?.nombre,
      tipo: c.tipo,
      pacienteNombre: internacion?.paciente
        ? `${internacion.paciente.apellido}, ${internacion.paciente.nombre}`
        : null,
    };
  });

  const selectedDetail = selected ? buildCamaDetail(selected, selected.internaciones?.[0]) : null;

  const total = camas.length;
  const libres = camas.filter((c) => c.estado === "LIBRE").length;
  const ocupadas = camas.filter((c) => c.estado === "OCUPADA").length;
  const limpieza = camas.filter((c) => c.estado === "EN_LIMPIEZA").length;
  const fuera = camas.filter((c) => c.estado === "FUERA_DE_SERVICIO").length;
  const tasa = total > 0 ? Math.round((ocupadas / total) * 100) : 0;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Internación · Camas"
        title="Mapa de camas"
        description="Disponibilidad por sector. Seleccione una cama para ver el detalle y gestionar su estado."
        actions={
          <button
            type="button"
            onClick={fetchCamas}
            disabled={loading}
            className="btn-secondary inline-flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-5 gap-5">
        <OpsStat label="Camas" value={total} sub={`${tasa}% ocupación`} tone="neutral" />
        <OpsStat label="Libres" value={libres} sub="Asignable ahora" tone={libres === 0 ? "danger" : libres <= 2 ? "warning" : "success"} />
        <OpsStat label="Ocupadas" value={ocupadas} sub="Con internación activa" tone="info" />
        <OpsStat label="Limpieza" value={limpieza} sub="Próximamente disponible" tone="warning" />
        <OpsStat label="Fuera de servicio" value={fuera} sub="Inhabilitadas" tone="neutral" />
      </section>

      {loading ? (
        <div className="space-y-2">
          <div className="skeleton h-16" />
          <div className="skeleton h-64" />
        </div>
      ) : total === 0 ? (
        <div className="text-[13px] text-muted py-10 text-center border border-dashed border-border rounded-lg">
          No hay camas registradas todavía.
        </div>
      ) : (
        <BedMap
          camas={camasMap}
          selectedId={selected?.id}
          onSelect={(c) => {
            const full = camas.find((x) => x.id === c.id);
            setSelected(full ?? null);
          }}
        />
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Cama ${selected.numero}` : ""}>
        {selectedDetail && (
          <CamaDetailPanel
            cama={selectedDetail}
            estadosTransicion={estadosPosibles(selectedDetail.estado)}
            puedeGestionar={puedeGestionar}
            onChangeEstado={handleChangeEstado}
          />
        )}
      </Modal>
    </div>
  );
}