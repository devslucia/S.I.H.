"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, User, Hash, Activity, Microscope, Syringe } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";

interface LibroCirugia {
  id: string;
  quirofanoNumero: number;
  fechaProgramada: string;
  horaProgramada: string;
  tipo: string;
  estado: string;
  procedimiento?: string;
  diagnosticoPreop?: string;
  diagnosticoPostop?: string;
  hallazgos?: string;
  horaInicio?: string;
  horaFin?: string;
  cirujano?: { nombre: string } | null;
  ayudante1?: { nombre: string } | null;
  ayudante2?: { nombre: string } | null;
  anestesiologo?: { nombre: string } | null;
  instrumentador?: { nombre: string } | null;
  circulante?: string;
  implantes: any[];
  medicamentos: any[];
  practicas: any[];
}

export default function LibroQuirofanoPage() {
  const params = useParams();
  const router = useRouter();
  const [cirugia, setCirugia] = useState<LibroCirugia | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/quirofano/${params.cirugiaId}/libro`);
        if (res.ok) setCirugia(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.cirugiaId]);

  if (loading) return <p className="text-muted text-sm">Cargando libro de quirófano...</p>;
  if (!cirugia) return <p className="text-muted text-sm">Cirugía no encontrada.</p>;

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-white transition-colors text-sm">
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium text-white">Libro de Quirófano</h2>
          <Badge variant={cirugia.estado === "COMPLETADA" ? "success" : cirugia.estado === "EN_CURSO" ? "warning" : "info"}>
            {cirugia.estado}
          </Badge>
        </div>

        <h3 className="text-sm font-medium text-teal mb-3 uppercase tracking-wide">Datos de la Cirugía</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
          <div><span className="text-muted">Procedimiento:</span> <span className="text-white">{cirugia.procedimiento || "—"}</span></div>
          <div><span className="text-muted">Quirófano:</span> <span className="text-white">#{cirugia.quirofanoNumero}</span></div>
          <div><span className="text-muted">Fecha:</span> <span className="text-white">{formatDateTime(cirugia.fechaProgramada)}</span></div>
          <div><span className="text-muted">Hora Prog.:</span> <span className="text-white">{cirugia.horaProgramada}</span></div>
          <div><span className="text-muted">Hora Inicio:</span> <span className="text-white">{cirugia.horaInicio || "—"}</span></div>
          <div><span className="text-muted">Hora Fin:</span> <span className="text-white">{cirugia.horaFin || "—"}</span></div>
          <div><span className="text-muted">Tipo:</span> <span className="text-white">{cirugia.tipo}</span></div>
        </div>

        <h3 className="text-sm font-medium text-teal mb-3 uppercase tracking-wide">Equipo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-4">
          {cirugia.cirujano && <div><span className="text-muted">Cirujano:</span> <span className="text-white">{cirugia.cirujano.nombre}</span></div>}
          {cirugia.ayudante1 && <div><span className="text-muted">Ayudante 1:</span> <span className="text-white">{cirugia.ayudante1.nombre}</span></div>}
          {cirugia.ayudante2 && <div><span className="text-muted">Ayudante 2:</span> <span className="text-white">{cirugia.ayudante2.nombre}</span></div>}
          {cirugia.anestesiologo && <div><span className="text-muted">Anestesiólogo:</span> <span className="text-white">{cirugia.anestesiologo.nombre}</span></div>}
          {cirugia.instrumentador && <div><span className="text-muted">Instrumentador:</span> <span className="text-white">{cirugia.instrumentador.nombre}</span></div>}
          {cirugia.circulante && <div><span className="text-muted">Circulante:</span> <span className="text-white">{cirugia.circulante}</span></div>}
        </div>

        <h3 className="text-sm font-medium text-teal mb-3 uppercase tracking-wide">Diagnósticos</h3>
        <div className="space-y-2 text-sm mb-4">
          <div><span className="text-muted">Preoperatorio:</span> <span className="text-white">{cirugia.diagnosticoPreop || "—"}</span></div>
          <div><span className="text-muted">Postoperatorio:</span> <span className="text-white">{cirugia.diagnosticoPostop || "—"}</span></div>
          <div><span className="text-muted">Hallazgos:</span> <span className="text-white">{cirugia.hallazgos || "—"}</span></div>
        </div>

        {cirugia.implantes && cirugia.implantes.length > 0 && (
          <>
            <h3 className="text-sm font-medium text-teal mb-3 uppercase tracking-wide">Implantes</h3>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm text-gray-300">
                <thead className="bg-background">
                  <tr>
                    <th className="px-3 py-2 text-left text-muted font-medium">Código</th>
                    <th className="px-3 py-2 text-left text-muted font-medium">Nombre</th>
                    <th className="px-3 py-2 text-left text-muted font-medium">Lote</th>
                  </tr>
                </thead>
                <tbody>
                  {cirugia.implantes.map((imp: any) => (
                    <tr key={imp.id} className="border-t border-border">
                      <td className="px-3 py-2">{imp.codigo}</td>
                      <td className="px-3 py-2">{imp.nombre}</td>
                      <td className="px-3 py-2">{imp.lote || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {cirugia.medicamentos && cirugia.medicamentos.length > 0 && (
          <>
            <h3 className="text-sm font-medium text-teal mb-3 uppercase tracking-wide">Medicamentos</h3>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm text-gray-300">
                <thead className="bg-background">
                  <tr>
                    <th className="px-3 py-2 text-left text-muted font-medium">Nombre</th>
                    <th className="px-3 py-2 text-left text-muted font-medium">Cantidad</th>
                    <th className="px-3 py-2 text-left text-muted font-medium">Vía</th>
                  </tr>
                </thead>
                <tbody>
                  {cirugia.medicamentos.map((med: any) => (
                    <tr key={med.id} className="border-t border-border">
                      <td className="px-3 py-2">{med.nombre}</td>
                      <td className="px-3 py-2">{med.cantidad}</td>
                      <td className="px-3 py-2">{med.via || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {cirugia.practicas && cirugia.practicas.length > 0 && (
          <>
            <h3 className="text-sm font-medium text-teal mb-3 uppercase tracking-wide">Prácticas</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-300">
                <thead className="bg-background">
                  <tr>
                    <th className="px-3 py-2 text-left text-muted font-medium">Fecha</th>
                    <th className="px-3 py-2 text-left text-muted font-medium">Hora</th>
                    <th className="px-3 py-2 text-left text-muted font-medium">Práctica</th>
                  </tr>
                </thead>
                <tbody>
                  {cirugia.practicas.map((prac: any) => (
                    <tr key={prac.id} className="border-t border-border">
                      <td className="px-3 py-2">{formatDateTime(prac.fecha)}</td>
                      <td className="px-3 py-2">{prac.hora}</td>
                      <td className="px-3 py-2">{prac.practica}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
