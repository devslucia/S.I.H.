"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, AlertTriangle, Calendar, Bed, Activity } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatDate, formatDateTime } from "@/lib/utils";

interface Paciente {
  id: string;
  dni: string;
  apellido: string;
  nombre: string;
  sexo: string;
  fechaNac: string;
  cuil?: string;
  domicilio?: string;
  localidad?: string;
  telefono?: string;
  alergias?: { id: string; descripcion: string; sustancia: string }[];
  internaciones: Internacion[];
}

interface Internacion {
  id: string;
  numero: number;
  fechaIngreso: string;
  fechaEgreso?: string;
  motivoIngreso?: string;
  estado: string;
  cama?: { id: string; numero: string; sector: { nombre: string } } | null;
  obraSocial?: { nombre: string; sigla: string } | null;
}

const estadoBadge: Record<string, { variant: "success" | "warning" | "error" | "info" | "default"; label: string }> = {
  ACTIVA: { variant: "success", label: "Activa" },
  ALTA_MEDICA: { variant: "info", label: "Alta Médica" },
  FACTURADA: { variant: "default", label: "Facturada" },
  FALLECIDO: { variant: "error", label: "Fallecido" },
};

export default function PacienteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [loading, setLoading] = useState(true);
  const [nuevaInternacionOpen, setNuevaInternacionOpen] = useState(false);
  const [form, setForm] = useState({ camaId: "", obraSocialId: "", motivoIngreso: "", tipoIngreso: "PROGRAMADO" });
  const [saving, setSaving] = useState(false);

  const fetchPaciente = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pacientes/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setPaciente(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPaciente(); }, [params.id]);

  const handleCreateInternacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/internaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, pacienteId: params.id }),
      });
      if (res.ok) {
        setNuevaInternacionOpen(false);
        setForm({ camaId: "", obraSocialId: "", motivoIngreso: "", tipoIngreso: "PROGRAMADO" });
        fetchPaciente();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted text-sm">Cargando paciente...</p>;
  if (!paciente) return <p className="text-muted text-sm">Paciente no encontrado.</p>;

  const activeInternacion = paciente.internaciones.find((i) => i.estado === "ACTIVA");

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-white transition-colors text-sm">
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-teal/20 flex items-center justify-center text-teal font-medium text-xl">
              {paciente.nombre[0]}{paciente.apellido[0]}
            </div>
            <div>
              <h2 className="text-xl font-medium text-white">{paciente.apellido}, {paciente.nombre}</h2>
              <p className="text-muted text-sm">
                DNI: {paciente.dni} | {paciente.sexo} | {paciente.telefono || "—"}
              </p>
              {paciente.domicilio && <p className="text-muted text-xs">{paciente.domicilio}{paciente.localidad ? `, ${paciente.localidad}` : ""}</p>}
            </div>
          </div>
          {paciente.alergias && paciente.alergias.length > 0 && (
            <Badge variant="error" className="flex items-center gap-1">
              <AlertTriangle size={12} /> {paciente.alergias.length} alergia(s)
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Internaciones</h3>
        <Button onClick={() => setNuevaInternacionOpen(true)}>
          <Plus size={16} /> Nueva Internación
        </Button>
      </div>

      <div className="space-y-2">
        {paciente.internaciones.length === 0 ? (
          <p className="text-muted text-sm">Sin internaciones registradas.</p>
        ) : (
          paciente.internaciones.map((i) => {
            const badge = estadoBadge[i.estado] || { variant: "default" as const, label: i.estado };
            return (
              <div
                key={i.id}
                onClick={() => router.push(`/historia-clinica/${i.id}`)}
                className="card p-4 flex items-center justify-between cursor-pointer hover:border-teal/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-white font-medium">Internación #{i.numero}</p>
                    <p className="text-muted text-xs">
                      Ingreso: {formatDateTime(i.fechaIngreso)}
                      {i.fechaEgreso ? ` | Egreso: ${formatDateTime(i.fechaEgreso)}` : ""}
                    </p>
                    {i.motivoIngreso && <p className="text-muted text-xs">Motivo: {i.motivoIngreso}</p>}
                    {i.cama && <p className="text-muted text-xs">Cama: {i.cama.numero} - {i.cama.sector.nombre}</p>}
                    {i.obraSocial && <p className="text-muted text-xs">OS: {i.obraSocial.nombre}</p>}
                  </div>
                </div>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
            );
          })
        )}
      </div>

      {!activeInternacion && (
        <div className="card p-5 text-center">
          <Activity size={32} className="mx-auto text-teal mb-2" />
          <p className="text-white font-medium mb-1">No hay internación activa</p>
          <p className="text-muted text-sm mb-3">Este paciente no tiene una internación activa actualmente.</p>
          <Button onClick={() => setNuevaInternacionOpen(true)}>
            <Plus size={16} /> Nueva Internación
          </Button>
        </div>
      )}

      <Modal open={nuevaInternacionOpen} onClose={() => setNuevaInternacionOpen(false)} title="Nueva Internación" size="xl">
        <form onSubmit={handleCreateInternacion} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Cama ID" name="camaId" value={form.camaId} onChange={(e) => setForm((p) => ({ ...p, camaId: e.target.value }))} />
            <Input label="Obra Social ID" name="obraSocialId" value={form.obraSocialId} onChange={(e) => setForm((p) => ({ ...p, obraSocialId: e.target.value }))} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Tipo de Ingreso</label>
              <select name="tipoIngreso" value={form.tipoIngreso} onChange={(e) => setForm((p) => ({ ...p, tipoIngreso: e.target.value }))} className="select-field">
                <option value="PROGRAMADO">Programado</option>
                <option value="URGENCIA">Urgencia</option>
                <option value="GUARDIA">Guardia</option>
                <option value="DERIVACION">Derivación</option>
              </select>
            </div>
            <Input label="Motivo de Ingreso" name="motivoIngreso" value={form.motivoIngreso} onChange={(e) => setForm((p) => ({ ...p, motivoIngreso: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setNuevaInternacionOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
