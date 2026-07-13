"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Users, Clock, Microscope, Syringe, Activity, Stethoscope } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface CirugiaProtocolo {
  id: string;
  quirofanoId: string | null;
  quirofano?: { nombre: string } | null;
  fechaProgramada: string;
  horaProgramada: string;
  tipo: string;
  estado: string;
  diagnosticoPreop?: string;
  diagnosticoPostop?: string;
  procedimiento?: string;
  intervencionesAgregadas?: string;
  hallazgos?: string;
  horaInicio?: string;
  horaFin?: string;
  muestrasPatologicas?: number;
  muestrasBacteriologicas?: number;
  implantes: Implante[];
  medicamentos: MedicamentoCirugia[];
  practicas: PracticaCirugia[];
  arcoC: boolean;
  arm: boolean;
  ecografo: boolean;
}

interface Implante {
  id: string;
  codigo: string;
  nombre: string;
  lote?: string;
  modelo?: string;
  lado?: string;
}

interface MedicamentoCirugia {
  id: string;
  nombre: string;
  presentacion?: string;
  cantidad: number;
  via?: string;
}

interface PracticaCirugia {
  id: string;
  fecha: string;
  hora: string;
  practica: string;
  laboratorio?: string;
}

export default function ProtocoloQuirurgicoPage() {
  const params = useParams();
  const router = useRouter();
  const [cirugia, setCirugia] = useState<CirugiaProtocolo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/historia-clinica/${params.internacionId}/protocolo-quirurgico`);
        if (res.ok) setCirugia(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.internacionId]);

  if (loading) return <p className="text-muted text-sm">Cargando protocolo quirúrgico...</p>;
  if (!cirugia) return <p className="text-muted text-sm">No se encontró cirugía para esta internación.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-muted hover:text-text transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-display font-semibold text-text">Protocolo Quirúrgico</h2>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Cirugía</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted">Procedimiento:</span> <span className="text-text">{cirugia.procedimiento || "—"}</span></div>
          <div><span className="text-muted">Quirófano:</span> <span className="text-text">{cirugia.quirofano?.nombre || "—"}</span></div>
          <div><span className="text-muted">Fecha:</span> <span className="text-text">{formatDateTime(cirugia.fechaProgramada)}</span></div>
          <div><span className="text-muted">Hora:</span> <span className="text-text">{cirugia.horaProgramada}</span></div>
          <div><span className="text-muted">Tipo:</span> <span className="text-text">{cirugia.tipo}</span></div>
          <div><span className="text-muted">Estado:</span> <span className="text-text">{cirugia.estado}</span></div>
          <div><span className="text-muted">Hora Inicio:</span> <span className="text-text">{cirugia.horaInicio || "—"}</span></div>
          <div><span className="text-muted">Hora Fin:</span> <span className="text-text">{cirugia.horaFin || "—"}</span></div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Diagnósticos</h3>
        <div className="space-y-2 text-sm">
          <div><span className="text-muted">Preoperatorio:</span> <span className="text-text">{cirugia.diagnosticoPreop || "—"}</span></div>
          <div><span className="text-muted">Postoperatorio:</span> <span className="text-text">{cirugia.diagnosticoPostop || "—"}</span></div>
          <div><span className="text-muted">Hallazgos:</span> <span className="text-text">{cirugia.hallazgos || "—"}</span></div>
          <div><span className="text-muted">Intervenciones agregadas:</span> <span className="text-text">{cirugia.intervencionesAgregadas || "—"}</span></div>
        </div>
      </div>

      {cirugia.implantes.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Implantes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead className="bg-background">
                <tr>
                  <th className="px-3 py-2 text-left text-muted font-medium">Código</th>
                  <th className="px-3 py-2 text-left text-muted font-medium">Nombre</th>
                  <th className="px-3 py-2 text-left text-muted font-medium">Lote</th>
                  <th className="px-3 py-2 text-left text-muted font-medium">Modelo</th>
                  <th className="px-3 py-2 text-left text-muted font-medium">Lado</th>
                </tr>
              </thead>
              <tbody>
                {cirugia.implantes.map((imp) => (
                  <tr key={imp.id} className="border-t border-border">
                    <td className="px-3 py-2">{imp.codigo}</td>
                    <td className="px-3 py-2">{imp.nombre}</td>
                    <td className="px-3 py-2">{imp.lote || "—"}</td>
                    <td className="px-3 py-2">{imp.modelo || "—"}</td>
                    <td className="px-3 py-2">{imp.lado || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cirugia.medicamentos.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Medicamentos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead className="bg-background">
                <tr>
                  <th className="px-3 py-2 text-left text-muted font-medium">Nombre</th>
                  <th className="px-3 py-2 text-left text-muted font-medium">Presentación</th>
                  <th className="px-3 py-2 text-left text-muted font-medium">Cantidad</th>
                  <th className="px-3 py-2 text-left text-muted font-medium">Vía</th>
                </tr>
              </thead>
              <tbody>
                {cirugia.medicamentos.map((med) => (
                  <tr key={med.id} className="border-t border-border">
                    <td className="px-3 py-2">{med.nombre}</td>
                    <td className="px-3 py-2">{med.presentacion || "—"}</td>
                    <td className="px-3 py-2">{med.cantidad}</td>
                    <td className="px-3 py-2">{med.via || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cirugia.practicas.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Prácticas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead className="bg-background">
                <tr>
                  <th className="px-3 py-2 text-left text-muted font-medium">Fecha</th>
                  <th className="px-3 py-2 text-left text-muted font-medium">Hora</th>
                  <th className="px-3 py-2 text-left text-muted font-medium">Práctica</th>
                  <th className="px-3 py-2 text-left text-muted font-medium">Laboratorio</th>
                </tr>
              </thead>
              <tbody>
                {cirugia.practicas.map((prac) => (
                  <tr key={prac.id} className="border-t border-border">
                    <td className="px-3 py-2">{formatDateTime(prac.fecha)}</td>
                    <td className="px-3 py-2">{prac.hora}</td>
                    <td className="px-3 py-2">{prac.practica}</td>
                    <td className="px-3 py-2">{prac.laboratorio || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card p-5">
        <h3 className="text-sm font-medium text-accent mb-4 uppercase tracking-wide">Equipamiento</h3>
        <div className="flex gap-4 text-sm">
          <span className={`flex items-center gap-1 ${cirugia.arcoC ? "text-accent" : "text-muted"}`}>Arco C</span>
          <span className={`flex items-center gap-1 ${cirugia.arm ? "text-accent" : "text-muted"}`}>ARM</span>
          <span className={`flex items-center gap-1 ${cirugia.ecografo ? "text-accent" : "text-muted"}`}>Ecógrafo</span>
        </div>
      </div>
    </div>
  );
}
