"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Bed } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";

interface Internacion {
  id: string;
  numero: number;
  fechaIngreso: string;
  estado: string;
  motivoIngreso?: string;
  tipoIngreso?: string;
  medicoTratante?: { id: string; nombre: string } | null;
  paciente: { id: string; nombre: string; apellido: string; dni: string };
  cama?: { numero: string; sector: { nombre: string } } | null;
  obraSocial?: { nombre: string; sigla: string } | null;
}

export default function EsperaCamaPage() {
  const router = useRouter();
  const [internaciones, setInternaciones] = useState<Internacion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEspera = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/internaciones?estado=ACTIVA");
      if (res.ok) {
        const all = await res.json();
        setInternaciones(all.filter((i: Internacion) => !i.cama));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEspera(); }, [fetchEspera]);

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-white transition-colors text-sm">
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="flex items-center gap-3">
        <Clock className="w-7 h-7 text-amber" />
        <div>
          <h2 className="text-xl font-medium text-white">Espera de Cama</h2>
          <p className="text-muted text-sm">{internaciones.length} paciente(s) esperando asignación de cama</p>
        </div>
      </div>

      {loading ? (
        <p className="text-muted text-sm">Cargando...</p>
      ) : internaciones.length === 0 ? (
        <div className="card p-8 text-center">
          <Bed size={32} className="mx-auto text-accent mb-2" />
          <p className="text-white font-medium">No hay pacientes esperando cama</p>
          <p className="text-muted text-sm mt-1">Todos los pacientes internados tienen cama asignada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {internaciones.map((i) => (
            <div
              key={i.id}
              onClick={() => router.push(`/admision/${i.paciente.id}`)}
              className="card p-4 flex items-center justify-between cursor-pointer hover:border-accent/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center text-warning">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-white font-medium">{i.paciente.apellido}, {i.paciente.nombre}</p>
                  <p className="text-muted text-xs">
                    DNI: {i.paciente.dni} | HC #{i.numero} | Ingreso: {formatDateTime(i.fechaIngreso)}
                  </p>
                  {i.motivoIngreso && <p className="text-muted text-xs">Motivo: {i.motivoIngreso}</p>}
                  {i.tipoIngreso && <p className="text-muted text-xs">Tipo: {i.tipoIngreso}</p>}
                  {i.medicoTratante && <p className="text-muted text-xs">Tratante: {i.medicoTratante.nombre}</p>}
                  {i.obraSocial && <p className="text-muted text-xs">OS: {i.obraSocial.nombre}</p>}
                </div>
              </div>
              <Badge variant="warning">Sin cama</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
