"use client";

import { rolLabel } from "@/lib/estados";
import { useToast } from "@/components/ui/Toast";
import { apiErrorMessage } from "@/lib/api-errors";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Plus, CheckCircle, Clock, User, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { VoiceTextarea } from "@/components/ui/VoiceTextarea";
import { formatDateTime } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { LoadingState } from "@/components/ui/States";
import { HcSubpageHeader } from "@/components/historia-clinica/HcSubpageHeader";
import { SaveButton } from "@/components/ui/SaveButton";

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
  const session = useSession();
  const userRol = session?.data?.user?.rol;
  const canCreate = ["ADMIN","MEDICO","ENFERMERO","ANESTESIOLOGO"].includes(userRol || "");
  const [evoluciones, setEvoluciones] = useState<Evolucion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [nuevoContenido, setNuevoContenido] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEvoluciones = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/historia-clinica/${params.internacionId}/evoluciones`);
      if (res.ok) {
        setEvoluciones(await res.json());
        setLoadError(null);
      } else {
        setLoadError(await apiErrorMessage(res, "No se pudieron cargar las evoluciones"));
      }
    } catch (err) {
      console.error(err);
      setLoadError("Error de red al cargar las evoluciones");
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
        toast("success", "Evolución guardada correctamente");
        setNuevoContenido("");
        setShowEditor(false);
        fetchEvoluciones();
      } else {
        toast("error", await apiErrorMessage(res, "No se pudo guardar la evolución"));
      }
    } catch (err) {
      console.error(err);
      toast("error", "Error de conexión al guardar la evolución");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <HcSubpageHeader
        internacionId={params.internacionId as string}
        title="Evolución"
        description="Notas de evolución en orden cronológico, de la más reciente a la más antigua."
        actions={
          canCreate && !showEditor ? (
            <Button onClick={() => setShowEditor(true)}>
              <Plus size={16} /> Nueva nota
            </Button>
          ) : undefined
        }
      />

      {showEditor && (
        <div className="card p-4 space-y-3">
          <VoiceTextarea
            value={nuevoContenido}
            onChange={(v) => setNuevoContenido(v)}
            rows={10}
            placeholder="Escribí la nota de evolución..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowEditor(false); setNuevoContenido(""); }}>
              Cancelar
            </Button>
            <SaveButton type="button" onClick={handleCrearNota} saving={saving} disabled={!nuevoContenido.trim()} icon={Send} label="Guardar nota" />
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState label="Cargando evoluciones…" />
      ) : loadError ? (
        <p className="text-error text-sm">{loadError}</p>
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
              <p className="text-text text-sm whitespace-pre-wrap">{evo.contenido}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted">
                <User size={12} /> {evo.usuario.nombre} · {rolLabel(evo.usuario.rol)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
