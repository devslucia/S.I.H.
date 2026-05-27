"use client";

import { useState, useEffect } from "react";
import { Syringe, HeartPulse, CheckCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";

interface Prescripcion {
  id: string;
  fecha: string;
  tipo: string;
  droga?: string;
  dosis?: string;
  frecuencia?: string;
  via?: string;
  dieta?: string;
  descripcion?: string;
  estado: string;
}

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
}

interface Internacion {
  id: string;
  numero: number;
  paciente: Paciente;
  cama?: { numero: string; sector: { nombre: string } } | null;
  hcId?: string;
}

interface ControlData {
  hora: string;
  tipo: string;
  PA: string;
  FC: string;
  FR: string;
  temperatura: string;
  SatO2: string;
  observacion: string;
}

function ControlForm({ internacionId, onSaved }: { internacionId: string; onSaved: () => void }) {
  const [form, setForm] = useState<ControlData>({
    hora: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }),
    tipo: "SIGNOS_VITALES",
    PA: "", FC: "", FR: "", temperatura: "", SatO2: "", observacion: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/historia-clinica/${internacionId}/enfermeria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hora: form.hora,
          tipo: form.tipo,
          datos: {
            PA: form.PA,
            FC: form.FC,
            FR: form.FR,
            "T°": form.temperatura,
            SatO2: form.SatO2,
          },
          observacion: form.observacion || undefined,
        }),
      });
      if (res.ok) {
        setForm({ ...form, PA: "", FC: "", FR: "", temperatura: "", SatO2: "", observacion: "" });
        onSaved();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-black/20 rounded-lg border border-border">
      <div>
        <label className="block text-xs text-muted mb-1">Hora</label>
        <input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} className="input-field text-sm" required />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">PA (mmHg)</label>
        <input type="text" placeholder="120/80" value={form.PA} onChange={(e) => setForm({ ...form, PA: e.target.value })} className="input-field text-sm" />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">FC (lpm)</label>
        <input type="text" placeholder="80" value={form.FC} onChange={(e) => setForm({ ...form, FC: e.target.value })} className="input-field text-sm" />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">FR (rpm)</label>
        <input type="text" placeholder="16" value={form.FR} onChange={(e) => setForm({ ...form, FR: e.target.value })} className="input-field text-sm" />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">Temperatura (°C)</label>
        <input type="text" placeholder="37.0" value={form.temperatura} onChange={(e) => setForm({ ...form, temperatura: e.target.value })} className="input-field text-sm" />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">SatO2 (%)</label>
        <input type="text" placeholder="98" value={form.SatO2} onChange={(e) => setForm({ ...form, SatO2: e.target.value })} className="input-field text-sm" />
      </div>
      <div className="col-span-2">
        <label className="block text-xs text-muted mb-1">Observación</label>
        <input type="text" placeholder="—" value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} className="input-field text-sm" />
      </div>
      <div className="col-span-2 md:col-span-4 flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary text-sm">
          {saving ? "Guardando..." : "Guardar Control"}
        </button>
      </div>
    </form>
  );
}

function AplicarPrescripcion({ internacionId, prescripcionId, onApplied }: { internacionId: string; prescripcionId: string; onApplied: () => void }) {
  const [applying, setApplying] = useState(false);

  const handleAplicar = async () => {
    setApplying(true);
    try {
      const res = await fetch(`/api/historia-clinica/${internacionId}/enfermeria/aplicar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescripcionId }),
      });
      if (res.ok) onApplied();
    } catch (err) {
      console.error(err);
    } finally {
      setApplying(false);
    }
  };

  return (
    <button onClick={handleAplicar} disabled={applying} className="text-xs btn-primary py-1 px-2">
      {applying ? "..." : "Aplicar"}
    </button>
  );
}

export default function EnfermeriaPage() {
  const [internaciones, setInternaciones] = useState<Internacion[]>([]);
  const [prescripcionesMap, setPrescripcionesMap] = useState<Record<string, Prescripcion[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedInternacion, setSelectedInternacion] = useState<string | null>(null);

  const fetchInternaciones = async () => {
    try {
      const res = await fetch("/api/internaciones?estado=ACTIVA");
      if (res.ok) {
        const data = await res.json();
        setInternaciones(Array.isArray(data) ? data : []);

        const map: Record<string, Prescripcion[]> = {};
        for (const i of data) {
          try {
            const r = await fetch(`/api/historia-clinica/${i.id}/prescripciones`);
            if (r.ok) map[i.id] = await r.json();
          } catch {}
        }
        setPrescripcionesMap(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInternaciones(); }, []);

  if (loading) return <p className="text-muted text-sm">Cargando pacientes...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Syringe className="w-6 h-6 text-amber" />
        <h2 className="text-xl font-medium text-white">Enfermería</h2>
      </div>

      {internaciones.length === 0 ? (
        <p className="text-muted text-sm">No hay pacientes internados activos.</p>
      ) : (
        internaciones.map((i) => {
          const p = i.paciente;
          const prescs = prescripcionesMap[i.id]?.filter((pr) => pr.estado !== "COMPLETADA") || [];
          return (
            <div key={i.id} className="card overflow-hidden">
              <div className="p-4 flex items-center justify-between bg-black/20 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber/20 flex items-center justify-center text-amber font-medium text-sm">
                    {p.nombre[0]}{p.apellido[0]}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{p.apellido}, {p.nombre}</p>
                    <p className="text-xs text-muted">
                      DNI: {p.dni} | {i.cama ? `${i.cama.numero} - ${i.cama.sector.nombre}` : "Sin cama"} | #{i.numero}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={prescs.length > 1 ? "warning" : "info"}>
                    {prescs.length} indicación(es)
                  </Badge>
                  <button
                    onClick={() => setSelectedInternacion(selectedInternacion === i.id ? null : i.id)}
                    className="text-xs btn-secondary"
                  >
                    {selectedInternacion === i.id ? "Ocultar" : "Controles"}
                  </button>
                </div>
              </div>

              {prescs.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted text-xs">
                        <th className="px-4 py-2 text-left">Tipo</th>
                        <th className="px-4 py-2 text-left">Indicación</th>
                        <th className="px-4 py-2 text-left">Dosis/Vía</th>
                        <th className="px-4 py-2 text-left">Frecuencia</th>
                        <th className="px-4 py-2 text-left">Estado</th>
                        <th className="px-4 py-2 text-left">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescs.map((pr) => (
                        <tr key={pr.id} className="border-b border-border/50 hover:bg-border/20">
                          <td className="px-4 py-2.5">
                            <Badge variant={pr.tipo === "MEDICACION" ? "info" : "default"}>
                              {pr.tipo}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-white">{pr.droga || pr.dieta || pr.descripcion}</td>
                          <td className="px-4 py-2.5 text-muted">{pr.dosis}{pr.via ? ` - ${pr.via}` : ""}</td>
                          <td className="px-4 py-2.5 text-muted">{pr.frecuencia || "—"}</td>
                          <td className="px-4 py-2.5">
                            {pr.estado === "BLOQUEADA_ALERGIA" ? (
                              <span className="flex items-center gap-1 text-red text-xs">
                                <AlertTriangle size={12} /> Alergia
                              </span>
                            ) : pr.estado === "COMPLETADA" ? (
                              <span className="flex items-center gap-1 text-green-400 text-xs">
                                <CheckCircle size={12} /> Completa
                              </span>
                            ) : (
                              <span className="text-amber text-xs">Pendiente</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {pr.tipo === "MEDICACION" && pr.estado !== "COMPLETADA" && pr.estado !== "BLOQUEADA_ALERGIA" && (
                              <AplicarPrescripcion
                                internacionId={i.id}
                                prescripcionId={pr.id}
                                onApplied={fetchInternaciones}
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedInternacion === i.id && (
                <div className="p-4 border-t border-border">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <HeartPulse size={16} className="text-teal" /> Registrar Signos Vitales
                  </h4>
                  <ControlForm internacionId={i.id} onSaved={fetchInternaciones} />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
