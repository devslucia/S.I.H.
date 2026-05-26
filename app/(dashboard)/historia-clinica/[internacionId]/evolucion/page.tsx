"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, CheckCircle, Clock, User, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";

interface Evolucion {
  id: string;
  fecha: string;
  contenido: string;
  firmada: boolean;
  firmadaAt?: string;
  usuario: { id: string; nombre: string; rol: string };
}

export default function EvolucionPage() {
  const params = useParams();
  const router = useRouter();
  const [evoluciones, setEvoluciones] = useState<Evolucion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [nuevoContenido, setNuevoContenido] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchEvoluciones = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/historia-clinica/${params.internacionId}/evoluciones`);
      if (res.ok) setEvoluciones(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvoluciones(); }, [params.internacionId]);

  const handleCrearNota = async () => {
    if (!nuevoContenido.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/historia-clinica/${params.internacionId}/evoluciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido: nuevoContenido }),
      });
      if (res.ok) {
        setNuevoContenido("");
        setShowEditor(false);
        fetchEvoluciones();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-muted hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-medium text-white">Evolución</h2>
        </div>
        <Button onClick={() => setShowEditor(true)}>
          <Plus size={16} /> Nueva Nota
        </Button>
      </div>

      {showEditor && (
        <div className="card p-4 space-y-3">
          <textarea
            value={nuevoContenido}
            onChange={(e) => setNuevoContenido(e.target.value)}
            className="input-field min-h-[120px] resize-y"
            placeholder="Escriba la nota de evolución..."
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowEditor(false); setNuevoContenido(""); }}>
              Cancelar
            </Button>
            <Button onClick={handleCrearNota} disabled={saving || !nuevoContenido.trim()}>
              <Send size={16} /> {saving ? "Guardando..." : "Guardar Nota"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted text-sm">Cargando evoluciones...</p>
      ) : evoluciones.length === 0 ? (
        <p className="text-muted text-sm">Sin notas de evolución registradas.</p>
      ) : (
        <div className="space-y-3">
          {evoluciones.map((evo) => (
            <div key={evo.id} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Clock size={12} />
                  {formatDateTime(evo.fecha)}
                </div>
                <div className="flex items-center gap-2">
                  {evo.firmada ? (
                    <Badge variant="success" className="flex items-center gap-1"><CheckCircle size={10} /> Firmada</Badge>
                  ) : (
                    <Badge variant="warning" className="flex items-center gap-1">Sin firmar</Badge>
                  )}
                </div>
              </div>
              <p className="text-white text-sm whitespace-pre-wrap">{evo.contenido}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted">
                <User size={12} /> {evo.usuario.nombre} ({evo.usuario.rol})
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
